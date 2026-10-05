import { eq } from "drizzle-orm";
import { toDateKey } from "@/lib/date";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { toCents } from "@/lib/money";

export interface ImportRow {
	payment?: number;
	deposit?: number;
	date: string;
	notes?: string;
	category_id?: string;
	category_name?: string;
	category_group_name?: string;
}

export interface NormalizedImportRow {
	row: ImportRow;
	date: string;
	payment: number | null;
	deposit: number | null;
	notes: string;
}

const centsOrNull = (value: number | undefined) => {
	if (!value) return null;
	const cents = Math.abs(toCents(value));
	return cents === 0 ? null : cents;
};

const matchKey = (
	date: string,
	payment: number | null,
	deposit: number | null,
	notes: string,
) => `${date}|${payment ?? 0}|${deposit ?? 0}|${notes.trim().toLowerCase()}`;

export function normalizeImportRow(row: ImportRow): NormalizedImportRow {
	return {
		row,
		date: toDateKey(row.date),
		payment: centsOrNull(row.payment),
		deposit: centsOrNull(row.deposit),
		notes: row.notes?.trim() ?? "",
	};
}

export function planImport(
	accountId: string,
	rows: ImportRow[],
): { newRows: NormalizedImportRow[]; duplicates: number } {
	const existing = new Map<string, number>();
	for (const tx of db
		.select({
			date: transactions.date,
			payment: transactions.payment,
			deposit: transactions.deposit,
			notes: transactions.notes,
		})
		.from(transactions)
		.where(eq(transactions.account_id, accountId))
		.all()) {
		const key = matchKey(tx.date, tx.payment, tx.deposit, tx.notes ?? "");
		existing.set(key, (existing.get(key) ?? 0) + 1);
	}

	const newRows: NormalizedImportRow[] = [];
	let duplicates = 0;
	for (const row of rows) {
		const normalized = normalizeImportRow(row);
		const key = matchKey(
			normalized.date,
			normalized.payment,
			normalized.deposit,
			normalized.notes,
		);
		const remaining = existing.get(key) ?? 0;
		if (remaining > 0) {
			existing.set(key, remaining - 1);
			duplicates += 1;
		} else {
			newRows.push(normalized);
		}
	}
	return { newRows, duplicates };
}
