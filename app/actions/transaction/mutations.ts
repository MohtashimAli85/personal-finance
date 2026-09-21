"use server";
import { eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { accounts, categories, category_group, transactions } from "@/lib/db/schema";

function toAmount(value: unknown): number {
	const amount = Number(value);
	if (!Number.isFinite(amount)) return 0;
	return Math.abs(amount);
}

function normalizeDateInput(input: FormDataEntryValue | string | null): string {
	if (!input) return new Date().toISOString();
	const raw = String(input).trim();
	if (!raw) return new Date().toISOString();
	const asNumber = Number(raw);
	if (!Number.isNaN(asNumber) && asNumber > 100000000000) {
		return new Date(asNumber).toISOString();
	}
	const parsed = Date.parse(raw);
	if (Number.isNaN(parsed)) return new Date().toISOString();
	return new Date(parsed).toISOString();
}

function adjustBalance(accountId: string, amount: number) {
	db.update(accounts)
		.set({ balance: sql`coalesce(${accounts.balance}, 0) + ${amount}` })
		.where(eq(accounts.id, accountId))
		.run();
}

function updateAccountBalance(
	accountId?: string | null,
	payment?: number | null,
	deposit?: number | null,
	reverse = false,
) {
	if (!accountId) return;
	if (payment) {
		const amount = reverse ? Math.abs(payment) : -Math.abs(payment);
		adjustBalance(accountId, amount);
		return amount;
	}
	if (deposit) {
		const amount = reverse ? -Math.abs(deposit) : Math.abs(deposit);
		adjustBalance(accountId, amount);
		return amount;
	}
}

function revalidateAll() {
	revalidatePath("/");
	revalidatePath("/transactions");
	revalidatePath("/budget");
}
export async function updateTransactionColumn(
	id: string,
	column: keyof Omit<Transaction, "id">,
	value: Transaction[keyof Omit<Transaction, "id">],
) {
	const existing = db
		.select({ account_id: transactions.account_id })
		.from(transactions)
		.where(eq(transactions.id, id))
		.get();

	if (!existing) return;

	const accountId = existing.account_id;

	db.transaction(() => {
		const tx = db
			.select({
				payment: transactions.payment,
				deposit: transactions.deposit,
			})
			.from(transactions)
			.where(eq(transactions.id, id))
			.get();

		if (column === "account_id") {
			if (tx) {
				// Reverse balance impact on old account
				updateAccountBalance(accountId, tx.payment, tx.deposit, true);
				// Apply balance impact on new account
				updateAccountBalance(value as string, tx.payment, tx.deposit);
			}
		}

		// Update transaction row. If updating payment, clear deposit. If updating deposit, clear payment.
		if (column === "payment") {
			const nextPayment = toAmount(value);
			if (tx?.deposit) {
				updateAccountBalance(accountId, 0, tx.deposit, true); // Reverse old deposit
			}
			if (tx?.payment) {
				updateAccountBalance(accountId, tx.payment, 0, true); // Reverse old payment
			}
			updateAccountBalance(accountId, nextPayment); // Apply new payment
			db.update(transactions)
				.set({ payment: nextPayment, deposit: null })
				.where(eq(transactions.id, id))
				.run();
		} else if (column === "deposit") {
			const nextDeposit = toAmount(value);
			if (tx?.payment) {
				updateAccountBalance(accountId, tx.payment, 0, true); // Reverse old payment
			}
			if (tx?.deposit) {
				updateAccountBalance(accountId, 0, tx.deposit, true); // Reverse old deposit
			}
			updateAccountBalance(accountId, 0, nextDeposit); // Apply new deposit
			db.update(transactions)
				.set({ deposit: nextDeposit, payment: null })
				.where(eq(transactions.id, id))
				.run();
		} else if (column === "date") {
			db.update(transactions)
				.set({ date: normalizeDateInput(value as string) })
				.where(eq(transactions.id, id))
				.run();
		} else if (column === "notes") {
			db.update(transactions)
				.set({ notes: value as string | null })
				.where(eq(transactions.id, id))
				.run();
		} else if (column === "category_id") {
			db.update(transactions)
				.set({ category_id: value as string | null })
				.where(eq(transactions.id, id))
				.run();
		} else {
			throw new Error(`Unsupported column update: ${column}`);
		}
	});
	revalidateAll();
}
export async function createTransaction(tx: Omit<Transaction, "id">) {
	db.transaction(() => {
		db.insert(transactions)
			.values({
				id: crypto.randomUUID(),
				payment: tx.payment,
				deposit: tx.deposit,
				date: normalizeDateInput(tx.date),
				account_id: tx.account_id,
				category_id: tx.category_id,
				notes: tx.notes,
			})
			.run();
		if (tx.account_id) {
			updateAccountBalance(tx.account_id, tx.payment, tx.deposit);
		}
	});
	revalidateAll();
}

export async function updateTransaction(formData: FormData) {
	const payment = toAmount(formData.get("payment"));
	const deposit = toAmount(formData.get("deposit"));
	const id = String(formData.get("id"));
	const newDate = normalizeDateInput(formData.get("date"));
	const newAccountId = (formData.get("accountId") as string) ?? null;
	const newCategoryId = (formData.get("categoryId") as string) ?? null;
	const newNotes = (formData.get("notes") as string) ?? null;

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

	const oldAccountId = existing.account_id ?? null;

	db.transaction(() => {
		// Reverse old balance impact on old account
		if (oldAccountId) {
			updateAccountBalance(
				oldAccountId,
				existing.payment,
				existing.deposit,
				true,
			);
		}

		// Apply new balance impact on new account (could be same account)
		if (newAccountId) {
			updateAccountBalance(newAccountId, payment, deposit);
		}

		// Update transaction row
		db.update(transactions)
			.set({
				payment,
				deposit,
				date: newDate,
				account_id: newAccountId,
				category_id: newCategoryId,
				notes: newNotes,
			})
			.where(eq(transactions.id, id))
			.run();
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
		// Reverse balance impact before deleting
		if (tx.account_id) {
			updateAccountBalance(tx.account_id, tx.payment, tx.deposit, true);
		}
		db.delete(transactions).where(eq(transactions.id, id)).run();
	});

	revalidateAll();
}

export async function bulkDeleteTransactions(ids: string[]) {
	if (!ids || ids.length === 0) return;

	const transactionsToDelete = db
		.select({
			id: transactions.id,
			payment: transactions.payment,
			deposit: transactions.deposit,
			account_id: transactions.account_id,
		})
		.from(transactions)
		.where(inArray(transactions.id, ids))
		.all();

	if (!transactionsToDelete || transactionsToDelete.length === 0) return;

	db.transaction(() => {
		// Reverse balance impact for each transaction
		for (const tx of transactionsToDelete) {
			if (tx.account_id) {
				updateAccountBalance(tx.account_id, tx.payment, tx.deposit, true);
			}
		}

		// Delete all transactions at once
		db.delete(transactions).where(inArray(transactions.id, ids)).run();
	});

	revalidateAll();
}

export interface ImportRow {
	payment?: number;
	deposit?: number;
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

export async function bulkImportTransactions(
	accountId: string,
	rows: ImportRow[],
) {
	if (!rows.length) return { count: 0 };

	db.transaction(() => {
		const categoryCache = new Map<string, string>();
		const groupCache = new Map<string, string>();

		for (const row of rows) {
			const payment = row.payment ? Math.abs(row.payment) : undefined;
			const deposit = row.deposit ? Math.abs(row.deposit) : undefined;
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
					payment: payment || null,
					deposit: deposit || null,
					date: normalizeDateInput(row.date),
					account_id: accountId,
					category_id: categoryId,
					notes: row.notes || null,
				})
				.run();
			updateAccountBalance(accountId, payment, deposit);
		}
	});

	revalidateAll();
	return { count: rows.length };
}

export async function exportAllTransactions(
	accountId?: string,
): Promise<string | null> {
	const { getTransactions } = await import("@/lib/transaction");
	const { serializeCSV } = await import("@/lib/csv");

	const params: SearchParams = { limit: "0" };
	if (accountId) params.accountId = accountId;

	const { data: transactions } = getTransactions(params);
	if (transactions.length === 0) return null;

	const headers = [
		"Date",
		"Account",
		"Notes",
		"Category",
		"Payment",
		"Deposit",
	];
	const rows = transactions.map((tx) => [
		tx.date ? new Date(tx.date).toLocaleDateString("en-CA") : "",
		tx.account_name ?? "",
		tx.notes ?? "",
		tx.category_name ?? "",
		tx.payment ? String(tx.payment) : "",
		tx.deposit ? String(tx.deposit) : "",
	]);

	return serializeCSV(headers, rows);
}
