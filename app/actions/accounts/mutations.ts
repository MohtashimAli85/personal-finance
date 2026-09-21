"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { AccountValues } from "@/components/accounts/schema";
import { applyBalanceDelta } from "@/lib/balance";
import { db } from "@/lib/db";
import {
	accounts,
	categories,
	category_group,
	transactions,
} from "@/lib/db/schema";
import { toCents } from "@/lib/money";

const revalidateAccounts = () => {
	revalidatePath("/");
	revalidatePath("/transactions");
	revalidatePath("/budget");
};

/** Finds (or creates) the "Starting Balances" category used to attribute a
 * new account's opening balance, so it appears in history and budget
 * activity like any other transaction instead of being an unexplained number. */
function ensureStartingBalanceCategory(): string {
	const existing = db
		.select({ id: categories.id })
		.from(categories)
		.where(eq(categories.name, "Starting Balances"))
		.get();
	if (existing) return existing.id;

	let incomeGroupId = db
		.select({ id: category_group.id })
		.from(category_group)
		.where(eq(category_group.is_income, true))
		.get()?.id;
	if (!incomeGroupId) {
		incomeGroupId = crypto.randomUUID();
		db.insert(category_group)
			.values({
				id: incomeGroupId,
				name: "Income",
				is_income: true,
				sort_order: 9999,
			})
			.run();
	}
	const id = crypto.randomUUID();
	db.insert(categories)
		.values({ id, name: "Starting Balances", group_id: incomeGroupId })
		.run();
	return id;
}

export async function createAccount(
	_previousState: ActionState,
	payload: AccountValues,
) {
	const name = payload.name.trim();
	if (!name) {
		return {
			success: false,
			shouldValidate: true,
			payload,
			errors: { name: { message: "Account name is required." } },
		};
	}
	const existingAccount = db
		.select({ id: accounts.id })
		.from(accounts)
		.where(eq(accounts.name, name))
		.get();
	if (existingAccount) {
		return {
			success: false,
			shouldValidate: true,
			payload,
			errors: {
				name: { message: "An account with this name already exists." },
			},
		};
	}

	try {
		const accountType = payload.offBudget ? "off_budget" : "on_budget";
		const startingCents = toCents(payload.initialBalance);
		const accountId = crypto.randomUUID();

		db.transaction(() => {
			db.insert(accounts)
				.values({ id: accountId, name, balance: 0, account_type: accountType })
				.run();

			if (startingCents !== 0) {
				const categoryId = ensureStartingBalanceCategory();
				db.insert(transactions)
					.values({
						id: crypto.randomUUID(),
						account_id: accountId,
						category_id: categoryId,
						payment: startingCents < 0 ? Math.abs(startingCents) : null,
						deposit: startingCents > 0 ? startingCents : null,
						date: new Date().toISOString().slice(0, 10),
						notes: "Starting balance",
						source: "manual",
						status: "cleared",
					})
					.run();
				applyBalanceDelta(accountId, startingCents);
			}
		});
		revalidateAccounts();
		return { message: "Account created successfully!", success: true };
	} catch (error) {
		console.error("Error creating account:", error);
		return {
			message: "Failed to create account. Please try again.",
			success: false,
		};
	}
}

export async function updateAccount(
	id: string,
	updates: { name?: string; account_type?: "on_budget" | "off_budget" },
) {
	const name = updates.name?.trim();
	if (updates.name !== undefined) {
		if (!name) throw new Error("Account name is required.");
		const clash = db
			.select({ id: accounts.id })
			.from(accounts)
			.where(eq(accounts.name, name))
			.get();
		if (clash && clash.id !== id) {
			throw new Error("An account with this name already exists.");
		}
	}
	db.update(accounts)
		.set({
			...(name !== undefined ? { name } : {}),
			...(updates.account_type ? { account_type: updates.account_type } : {}),
		})
		.where(eq(accounts.id, id))
		.run();
	revalidateAccounts();
}

/**
 * Archives an account rather than deleting it - its transactions and budget
 * history stay intact and it disappears from pickers, but nothing is lost.
 * If a transferAccountId is given, the account's current balance is moved
 * there first (as a transfer, not a raw balance edit) so the number is
 * accounted for rather than vanishing.
 */
export async function archiveAccount(formData: FormData) {
	const id = formData.get("id") as string;
	const transferAccountId = (formData.get("account_id") as string) || "";

	const account = db.select().from(accounts).where(eq(accounts.id, id)).get();
	if (!account) return;

	db.transaction(() => {
		if (
			transferAccountId &&
			transferAccountId !== id &&
			account.balance !== 0
		) {
			const transferId = crypto.randomUUID();
			const today = new Date().toISOString().slice(0, 10);
			const cents = account.balance;
			db.insert(transactions)
				.values({
					id: crypto.randomUUID(),
					account_id: id,
					payment: cents > 0 ? cents : null,
					deposit: cents < 0 ? -cents : null,
					date: today,
					notes: "Transfer before closing account",
					source: "transfer",
					status: "cleared",
					transfer_id: transferId,
				})
				.run();
			db.insert(transactions)
				.values({
					id: crypto.randomUUID(),
					account_id: transferAccountId,
					payment: cents < 0 ? -cents : null,
					deposit: cents > 0 ? cents : null,
					date: today,
					notes: "Transfer before closing account",
					source: "transfer",
					status: "cleared",
					transfer_id: transferId,
				})
				.run();
			applyBalanceDelta(id, -cents);
			applyBalanceDelta(transferAccountId, cents);
		}
		db.update(accounts)
			.set({ closed_at: new Date().toISOString() })
			.where(eq(accounts.id, id))
			.run();
	});
	revalidateAccounts();
}

export async function reopenAccount(id: string) {
	db.update(accounts).set({ closed_at: null }).where(eq(accounts.id, id)).run();
	revalidateAccounts();
}

/**
 * Permanently deletes an account and every transaction it owns (cascade).
 * Irreversible - callers must confirm with the user first, including how
 * many transactions will be destroyed (see lib/account.ts countAccountTransactions).
 */
export async function forceCloseAccount(id: string) {
	db.transaction(() => db.delete(accounts).where(eq(accounts.id, id)).run());
	revalidateAccounts();
}

// Back-compat alias for existing call sites/imports.
export const closeAccount = archiveAccount;
