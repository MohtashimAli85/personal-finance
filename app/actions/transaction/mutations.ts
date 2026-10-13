"use server";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { applyBalanceDelta, balanceEffect, signedAmount } from "@/lib/balance";
import { type ImportRow, planImport } from "@/lib/csv-import";
import { toDateKey, tryParseDateKey } from "@/lib/date";
import { db } from "@/lib/db";
import { categories, category_group, transactions } from "@/lib/db/schema";
import { toCents } from "@/lib/money";

// All amounts crossing this module's boundary are integer cents (see
// lib/money.ts) unless a function's doc says otherwise (bulkImportTransactions
// takes decimal amounts, matching what a CSV file contains, and converts
// internally).

/** Converts a decimal amount (string from an input, or number from a draft
 * transaction) to absolute integer cents. Always treats the input as
 * decimal - never already-cents - regardless of its JS type. */
function toCentsAmount(value: unknown): number {
	return Math.abs(toCents(value));
}

function revalidateAll() {
	revalidatePath("/");
	revalidatePath("/transactions");
	revalidatePath("/budget");
}

type EditableColumn =
	| "account_id"
	| "category_id"
	| "payment"
	| "deposit"
	| "date"
	| "notes";

type TransactionPatch = Partial<
	Pick<
		typeof transactions.$inferInsert,
		"account_id" | "category_id" | "payment" | "deposit" | "date" | "notes"
	>
>;

function buildPatch(column: EditableColumn, value: unknown): TransactionPatch {
	switch (column) {
		case "account_id":
			return { account_id: (value as string) || null };
		case "payment":
			return { payment: toCentsAmount(value) || null, deposit: null };
		case "deposit":
			return { deposit: toCentsAmount(value) || null, payment: null };
		case "date": {
			const date = tryParseDateKey(value as string);
			return date ? { date } : {};
		}
		case "notes":
			return { notes: (value as string) || null };
		case "category_id":
			return { category_id: (value as string) || null };
	}
}

function mirrorPatch(patch: TransactionPatch): TransactionPatch {
	const mirrored: TransactionPatch = {};
	if ("payment" in patch) {
		mirrored.payment = patch.deposit;
		mirrored.deposit = patch.payment;
	}
	if (patch.date) mirrored.date = patch.date;
	return mirrored;
}

type BalanceRow = {
	id: string;
	account_id: string | null;
	payment: number | null;
	deposit: number | null;
	status: string | null;
};

function applyPatch(row: BalanceRow, patch: TransactionPatch) {
	if (Object.keys(patch).length === 0) return;
	const next = { ...row, ...patch };
	applyBalanceDelta(row.account_id, -balanceEffect(row));
	applyBalanceDelta(next.account_id, balanceEffect(next));
	db.update(transactions).set(patch).where(eq(transactions.id, row.id)).run();
}

const balanceColumns = {
	id: transactions.id,
	account_id: transactions.account_id,
	payment: transactions.payment,
	deposit: transactions.deposit,
	status: transactions.status,
};

export async function updateTransactionColumn(
	id: string,
	column: EditableColumn,
	value: unknown,
) {
	db.transaction(() => {
		const existing = db
			.select({ ...balanceColumns, transfer_id: transactions.transfer_id })
			.from(transactions)
			.where(eq(transactions.id, id))
			.get();
		if (!existing) return;

		const patch = buildPatch(column, value);
		const partner = existing.transfer_id
			? db
					.select(balanceColumns)
					.from(transactions)
					.where(
						and(
							eq(transactions.transfer_id, existing.transfer_id),
							ne(transactions.id, id),
						),
					)
					.get()
			: undefined;

		if (
			partner &&
			patch.account_id !== undefined &&
			patch.account_id === partner.account_id
		) {
			throw new Error("Cannot transfer an account to itself");
		}

		applyPatch(existing, patch);
		if (partner) applyPatch(partner, mirrorPatch(patch));
	});
	revalidateAll();
}

export async function createTransaction(tx: Omit<Transaction, "id">) {
	const accountId = tx.account_id || null;
	const categoryId = tx.category_id || null;
	const payment = tx.payment ? toCentsAmount(tx.payment) : null;
	const deposit = tx.deposit ? toCentsAmount(tx.deposit) : null;
	const date = tryParseDateKey(tx.date);
	if (!date) throw new Error("Invalid transaction date");

	db.transaction(() => {
		db.insert(transactions)
			.values({
				id: crypto.randomUUID(),
				payment,
				deposit,
				date,
				account_id: accountId,
				category_id: categoryId,
				notes: tx.notes || null,
			})
			.run();
		applyBalanceDelta(accountId, signedAmount(payment, deposit));
	});
	revalidateAll();
}

function deleteWithTransferPartners(ids: string[]) {
	db.transaction(() => {
		const selected = db
			.select({ ...balanceColumns, transfer_id: transactions.transfer_id })
			.from(transactions)
			.where(inArray(transactions.id, ids))
			.all();
		const transferIds = selected.flatMap((tx) =>
			tx.transfer_id ? [tx.transfer_id] : [],
		);
		const partners = transferIds.length
			? db
					.select(balanceColumns)
					.from(transactions)
					.where(inArray(transactions.transfer_id, transferIds))
					.all()
			: [];

		const rows = new Map<string, BalanceRow>();
		for (const tx of [...selected, ...partners]) rows.set(tx.id, tx);
		if (rows.size === 0) return;

		for (const tx of rows.values()) {
			applyBalanceDelta(tx.account_id, -balanceEffect(tx));
		}
		db.delete(transactions)
			.where(inArray(transactions.id, [...rows.keys()]))
			.run();
	});
	revalidateAll();
}

export async function deleteTransaction(formData: FormData) {
	deleteWithTransferPartners([String(formData.get("id"))]);
}

export async function bulkDeleteTransactions(ids: string[]) {
	if (!ids || ids.length === 0) return;
	deleteWithTransferPartners(ids);
}

/**
 * Creates a linked pair of transactions moving money between two of the
 * user's own accounts. Transfer legs carry no category and are excluded from
 * income/expense summaries and budget activity, so moving your own money is
 * never counted as income or spending.
 */
export async function createTransfer(input: {
	fromAccountId: string;
	toAccountId: string;
	amount: number; // decimal, e.g. 150.50
	date: string;
	notes?: string;
}) {
	if (input.fromAccountId === input.toAccountId) {
		throw new Error("Cannot transfer an account to itself");
	}
	const cents = toCentsAmount(input.amount);
	if (cents <= 0) throw new Error("Transfer amount must be greater than zero");

	const transferId = crypto.randomUUID();
	const dateKey = toDateKey(input.date);

	db.transaction(() => {
		db.insert(transactions)
			.values({
				id: crypto.randomUUID(),
				account_id: input.fromAccountId,
				payment: cents,
				deposit: null,
				date: dateKey,
				notes: input.notes || "Transfer",
				source: "transfer",
				status: "cleared",
				transfer_id: transferId,
			})
			.run();
		db.insert(transactions)
			.values({
				id: crypto.randomUUID(),
				account_id: input.toAccountId,
				payment: null,
				deposit: cents,
				date: dateKey,
				notes: input.notes || "Transfer",
				source: "transfer",
				status: "cleared",
				transfer_id: transferId,
			})
			.run();
		applyBalanceDelta(input.fromAccountId, -cents);
		applyBalanceDelta(input.toAccountId, cents);
	});
	revalidateAll();
}

export type { ImportRow } from "@/lib/csv-import";

/**
 * Finds a category by name, creating it (and its group, if named) when it
 * doesn't exist yet. Caches within the batch so repeated names in the same
 * import don't race the categories.name unique constraint.
 */
function resolveOrCreateCategory(
	categoryName: string,
	groupName: string | undefined,
	categoryCache: Map<string, string>,
	groupCache: Map<string, string>,
): string {
	const cacheKey = categoryName.toLowerCase();
	const cached = categoryCache.get(cacheKey);
	if (cached) return cached;

	const existing = db
		.select({ id: categories.id })
		.from(categories)
		.where(sql`lower(${categories.name}) = ${cacheKey}`)
		.get();
	if (existing) {
		categoryCache.set(cacheKey, existing.id);
		return existing.id;
	}

	let groupId: string | null = null;
	if (groupName) {
		const groupKey = groupName.toLowerCase();
		groupId = groupCache.get(groupKey) ?? null;
		if (!groupId) {
			const existingGroup = db
				.select({ id: category_group.id })
				.from(category_group)
				.where(sql`lower(${category_group.name}) = ${groupKey}`)
				.get();
			groupId = existingGroup?.id ?? null;
			if (!groupId) {
				groupId = crypto.randomUUID();
				db.insert(category_group)
					.values({ id: groupId, name: groupName })
					.run();
			}
			groupCache.set(groupKey, groupId);
		}
	}

	const categoryId = crypto.randomUUID();
	db.insert(categories)
		.values({ id: categoryId, name: categoryName, group_id: groupId })
		.run();
	categoryCache.set(cacheKey, categoryId);
	return categoryId;
}

export async function previewImport(
	accountId: string,
	rows: ImportRow[],
): Promise<{ newCount: number; duplicates: number }> {
	if (!accountId || !rows.length) return { newCount: 0, duplicates: 0 };
	const { newRows, duplicates } = planImport(accountId, rows);
	return { newCount: newRows.length, duplicates };
}

export async function bulkImportTransactions(
	accountId: string,
	rows: ImportRow[],
): Promise<{ inserted: number; duplicates: number }> {
	if (!rows.length) return { inserted: 0, duplicates: 0 };

	let inserted = 0;
	let duplicates = 0;

	db.transaction(() => {
		const plan = planImport(accountId, rows);
		duplicates = plan.duplicates;
		const categoryCache = new Map<string, string>();
		const groupCache = new Map<string, string>();

		for (const { row, date, payment, deposit, notes } of plan.newRows) {
			const categoryId = row.category_name
				? resolveOrCreateCategory(
						row.category_name,
						row.category_group_name,
						categoryCache,
						groupCache,
					)
				: (row.category_id ?? null);

			db.insert(transactions)
				.values({
					id: crypto.randomUUID(),
					payment,
					deposit,
					date,
					account_id: accountId,
					category_id: categoryId,
					notes: notes || null,
					source: "csv",
					status: "cleared",
				})
				.run();
			applyBalanceDelta(accountId, signedAmount(payment, deposit));
			inserted += 1;
		}
	});

	revalidateAll();
	return { inserted, duplicates };
}

export async function exportAllTransactions(
	accountId?: string,
): Promise<string | null> {
	const { getTransactions } = await import("@/lib/transaction");
	const { serializeCSV } = await import("@/lib/csv");
	const { fromCents } = await import("@/lib/money");

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
