"use server";
import { z } from "zod";
import { serializeCSV } from "@/lib/csv";
import { type ImportRow, importCsvRows, planImport } from "@/lib/csv-import";
import { fromCents } from "@/lib/money";
import { serverAction } from "@/lib/server-action";
import { getTransactions } from "@/lib/transaction";
import {
	createTransactionRecord,
	createTransferRecord,
	deleteTransactionRecords,
	type TransactionPatch,
	updateTransactionRecord,
} from "@/lib/transaction-mutations";
import {
	cents,
	dateKey,
	id,
	optionalId,
	positiveCents,
} from "@/lib/validation";

const amountOrNull = cents.transform((value) => Math.abs(value) || null);
const optionalText = z
	.string()
	.nullish()
	.transform((value) => value || null);

const editSchema = z.discriminatedUnion("column", [
	z.object({ id, column: z.literal("account_id"), value: optionalId }),
	z.object({ id, column: z.literal("category_id"), value: optionalId }),
	z.object({ id, column: z.literal("payment"), value: amountOrNull }),
	z.object({ id, column: z.literal("deposit"), value: amountOrNull }),
	z.object({ id, column: z.literal("date"), value: dateKey }),
	z.object({ id, column: z.literal("notes"), value: optionalText }),
]);

function toPatch(edit: z.output<typeof editSchema>): TransactionPatch {
	switch (edit.column) {
		case "payment":
			return { payment: edit.value, deposit: null };
		case "deposit":
			return { deposit: edit.value, payment: null };
		default:
			return { [edit.column]: edit.value };
	}
}

export const updateTransactionColumn = serverAction(editSchema, (edit) => {
	updateTransactionRecord(edit.id, toPatch(edit));
});

export const createTransaction = serverAction(
	z.object({
		account_id: id,
		category_id: optionalId,
		payment: amountOrNull.optional(),
		deposit: amountOrNull.optional(),
		date: dateKey,
		notes: optionalText,
	}),
	(tx) => {
		createTransactionRecord({
			...tx,
			payment: tx.payment ?? null,
			deposit: tx.deposit ?? null,
		});
	},
);

export const bulkDeleteTransactions = serverAction(
	z.array(id).min(1),
	(ids) => {
		deleteTransactionRecords(ids);
	},
);

export const createTransfer = serverAction(
	z.object({
		fromAccountId: id,
		toAccountId: id,
		amount: positiveCents,
		date: dateKey,
		notes: optionalText,
	}),
	(input) => {
		createTransferRecord(input);
	},
);

const importSchema = z.object({
	accountId: id,
	rows: z.array(
		z.object({
			payment: z.number().optional(),
			deposit: z.number().optional(),
			date: z.string(),
			notes: z.string().optional(),
			category_id: z.string().optional(),
			category_name: z.string().optional(),
			category_group_name: z.string().optional(),
		}),
	),
});

export type { ImportRow };

export async function previewImport(
	input: z.input<typeof importSchema>,
): Promise<{ newCount: number; duplicates: number }> {
	const parsed = importSchema.safeParse(input);
	if (!parsed.success || parsed.data.rows.length === 0) {
		return { newCount: 0, duplicates: 0 };
	}
	const { newRows, duplicates } = planImport(
		parsed.data.accountId,
		parsed.data.rows,
	);
	return { newCount: newRows.length, duplicates };
}

/** Row amounts are decimals, as the CSV file has them. */
export const bulkImportTransactions = serverAction(
	importSchema,
	({ accountId, rows }) => ({
		success: true,
		payload: importCsvRows(accountId, rows),
	}),
);

export async function exportAllTransactions(
	accountId?: string,
): Promise<string | null> {
	const params: SearchParams = { limit: "0" };
	if (accountId) params.accountId = accountId;

	const { data: rows } = getTransactions(params);
	if (rows.length === 0) return null;

	const headers = [
		"Date",
		"Account",
		"Notes",
		"Category",
		"Payment",
		"Deposit",
	];
	const csvRows = rows.map((tx) => [
		tx.date ?? "",
		tx.account_name ?? "",
		tx.notes ?? "",
		tx.category_name ?? "",
		tx.payment ? fromCents(tx.payment).toFixed(2) : "",
		tx.deposit ? fromCents(tx.deposit).toFixed(2) : "",
	]);

	return serializeCSV(headers, csvRows);
}
