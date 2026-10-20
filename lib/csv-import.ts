import { eq, sql } from "drizzle-orm";
import { toDateKey } from "@/lib/date";
import { db } from "@/lib/db";
import { categories, category_group, transactions } from "@/lib/db/schema";
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

/** Imports CSV rows (decimal amounts) into an account, skipping rows that
 * already exist there. */
export function importCsvRows(
	accountId: string,
	rows: ImportRow[],
): { inserted: number; duplicates: number } {
	return db.transaction(() => {
		const plan = planImport(accountId, rows);
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
		}
		return { inserted: plan.newRows.length, duplicates: plan.duplicates };
	});
}
