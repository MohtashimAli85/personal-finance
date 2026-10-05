"use server";
import { createHash } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { applyBalanceDelta, signedAmount } from "@/lib/balance";
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

const EDITABLE_COLUMNS = [
	"account_id",
	"category_id",
	"payment",
	"deposit",
	"date",
	"notes",
] as const;
type EditableColumn = (typeof EDITABLE_COLUMNS)[number];

export async function updateTransactionColumn(
	id: string,
	column: EditableColumn,
	value: unknown,
) {
	const existing = db
		.select({
			account_id: transactions.account_id,
			payment: transactions.payment,
			deposit: transactions.deposit,
		})
		.from(transactions)
		.where(eq(transactions.id, id))
		.get();
	if (!existing) return;

	db.transaction(() => {
		switch (column) {
			case "account_id": {
				const nextAccountId = (value as string) || null;
				if (nextAccountId === existing.account_id) return;
				// Reverse the balance impact on the old account, apply it to the new one.
				applyBalanceDelta(
					existing.account_id,
					-signedAmount(existing.payment, existing.deposit),
				);
				applyBalanceDelta(
					nextAccountId,
					signedAmount(existing.payment, existing.deposit),
				);
				db.update(transactions)
					.set({ account_id: nextAccountId })
					.where(eq(transactions.id, id))
					.run();
				break;
			}
			case "payment": {
				const nextPayment = toCentsAmount(value) || null;
				const delta =
					signedAmount(nextPayment, null) -
					signedAmount(existing.payment, existing.deposit);
				applyBalanceDelta(existing.account_id, delta);
				db.update(transactions)
					.set({ payment: nextPayment, deposit: null })
					.where(eq(transactions.id, id))
					.run();
				break;
			}
			case "deposit": {
				const nextDeposit = toCentsAmount(value) || null;
				const delta =
					signedAmount(null, nextDeposit) -
					signedAmount(existing.payment, existing.deposit);
				applyBalanceDelta(existing.account_id, delta);
				db.update(transactions)
					.set({ deposit: nextDeposit, payment: null })
					.where(eq(transactions.id, id))
					.run();
				break;
			}
			case "date": {
				const dateKey = tryParseDateKey(value as string);
				if (!dateKey) return;
				db.update(transactions)
					.set({ date: dateKey })
					.where(eq(transactions.id, id))
					.run();
				break;
			}
			case "notes": {
				db.update(transactions)
					.set({ notes: (value as string) || null })
					.where(eq(transactions.id, id))
					.run();
				break;
			}
			case "category_id": {
				db.update(transactions)
					.set({ category_id: (value as string) || null })
					.where(eq(transactions.id, id))
					.run();
				break;
			}
		}
	});
	revalidateAll();
}

export async function createTransaction(tx: Omit<Transaction, "id">) {
	const accountId = tx.account_id || null;
	const categoryId = tx.category_id || null;
	const payment = tx.payment ? toCentsAmount(tx.payment) : null;
	const deposit = tx.deposit ? toCentsAmount(tx.deposit) : null;

	db.transaction(() => {
		db.insert(transactions)
			.values({
				id: crypto.randomUUID(),
				payment,
				deposit,
				date: toDateKey(tx.date),
				account_id: accountId,
				category_id: categoryId,
				notes: tx.notes || null,
			})
			.run();
		applyBalanceDelta(accountId, signedAmount(payment, deposit));
	});
	revalidateAll();
}

export async function deleteTransaction(formData: FormData) {
	const id = String(formData.get("id"));

	const tx = db
		.select({
			payment: transactions.payment,
			deposit: transactions.deposit,
			account_id: transactions.account_id,
		})
		.from(transactions)
		.where(eq(transactions.id, id))
		.get();
	if (!tx) return;

	db.transaction(() => {
		applyBalanceDelta(tx.account_id, -signedAmount(tx.payment, tx.deposit));
		db.delete(transactions).where(eq(transactions.id, id)).run();
	});
	revalidateAll();
}

export async function bulkDeleteTransactions(ids: string[]) {
	if (!ids || ids.length === 0) return;

	const rows = db
		.select({
			id: transactions.id,
			payment: transactions.payment,
			deposit: transactions.deposit,
			account_id: transactions.account_id,
		})
		.from(transactions)
		.where(inArray(transactions.id, ids))
		.all();
	if (rows.length === 0) return;

	db.transaction(() => {
		for (const tx of rows) {
			applyBalanceDelta(tx.account_id, -signedAmount(tx.payment, tx.deposit));
		}
		db.delete(transactions).where(inArray(transactions.id, ids)).run();
	});
	revalidateAll();
}

/**
 * Creates a linked pair of transactions moving money between two of the
 * user's own accounts. Transfer legs carry no category and are excluded from
 * income/expense summaries and (for on-budget <-> on-budget moves) budget
 * activity, so moving your own money is never counted as income or spending.
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

export interface ImportRow {
	payment?: number; // decimal, as it appears in the CSV
	deposit?: number; // decimal, as it appears in the CSV
	date: string;
	notes?: string;
	category_id?: string;
	category_name?: string;
	category_group_name?: string;
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

/** Stable hash used to detect a re-imported CSV row. */
function csvRowHash(
	accountId: string,
	date: string,
	payment: number | null,
	deposit: number | null,
	notes: string,
): string {
	return createHash("sha256")
		.update(
			`${accountId}|${date}|${payment ?? ""}|${deposit ?? ""}|${notes.trim().toLowerCase()}`,
		)
		.digest("hex");
}

export async function bulkImportTransactions(
	accountId: string,
	rows: ImportRow[],
): Promise<{ inserted: number; duplicates: number }> {
	if (!rows.length) return { inserted: 0, duplicates: 0 };

	const known = new Set(
		db
			.select({ hash: transactions.external_hash })
			.from(transactions)
			.where(eq(transactions.account_id, accountId))
			.all()
			.map((r) => r.hash)
			.filter((h): h is string => Boolean(h)),
	);

	let inserted = 0;
	let duplicates = 0;

	db.transaction(() => {
		const categoryCache = new Map<string, string>();
		const groupCache = new Map<string, string>();

		for (const row of rows) {
			const payment = row.payment ? toCentsAmount(row.payment) : null;
			const deposit = row.deposit ? toCentsAmount(row.deposit) : null;
			const dateKey = toDateKey(row.date);
			const notes = row.notes || "";
			const hash = csvRowHash(accountId, dateKey, payment, deposit, notes);

			if (known.has(hash)) {
				duplicates += 1;
				continue;
			}
			known.add(hash);

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
					date: dateKey,
					account_id: accountId,
					category_id: categoryId,
					notes: notes || null,
					source: "csv",
					external_hash: hash,
					status: "pending",
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
