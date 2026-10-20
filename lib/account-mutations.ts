import { and, eq, ne } from "drizzle-orm";
import { accountBalance } from "@/lib/balance";
import { toDateKey } from "@/lib/date";
import { db } from "@/lib/db";
import { accounts, categories, category_group } from "@/lib/db/schema";
import {
	createTransactionRecord,
	createTransferRecord,
} from "@/lib/transaction-mutations";
import { UserError } from "@/lib/user-error";

function assertNameFree(name: string, exceptId?: string) {
	const clash = db
		.select({ id: accounts.id })
		.from(accounts)
		.where(
			and(
				eq(accounts.name, name),
				exceptId ? ne(accounts.id, exceptId) : undefined,
			),
		)
		.get();
	if (clash) {
		throw new UserError("An account with this name already exists.", "name");
	}
}

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

export function createAccountRecord(input: {
	name: string;
	startingBalance: number;
	offBudget: boolean;
}): string {
	assertNameFree(input.name);
	const id = crypto.randomUUID();
	db.transaction(() => {
		db.insert(accounts)
			.values({
				id,
				name: input.name,
				account_type: input.offBudget ? "off_budget" : "on_budget",
			})
			.run();
		const cents = input.startingBalance;
		if (cents === 0) return;
		createTransactionRecord({
			account_id: id,
			category_id: ensureStartingBalanceCategory(),
			payment: cents < 0 ? -cents : null,
			deposit: cents > 0 ? cents : null,
			date: toDateKey(new Date()),
			notes: "Starting balance",
			source: "manual",
			status: "cleared",
		});
	});
	return id;
}

export function renameAccountRecord(id: string, name: string) {
	assertNameFree(name, id);
	db.update(accounts).set({ name }).where(eq(accounts.id, id)).run();
}

/**
 * Archives an account rather than deleting it - its transactions and budget
 * history stay intact and it disappears from pickers, but nothing is lost.
 * If a transferAccountId is given, the account's current balance is moved
 * there first (as a transfer, not a raw balance edit) so the number is
 * accounted for rather than vanishing.
 */
export function archiveAccountRecord(
	id: string,
	transferAccountId: string | null,
) {
	db.transaction(() => {
		const account = db
			.select({ balance: accountBalance })
			.from(accounts)
			.where(eq(accounts.id, id))
			.get();
		if (!account) throw new UserError("Account not found.");
		const cents = account.balance;
		if (transferAccountId && transferAccountId !== id && cents !== 0) {
			createTransferRecord({
				fromAccountId: cents > 0 ? id : transferAccountId,
				toAccountId: cents > 0 ? transferAccountId : id,
				amount: Math.abs(cents),
				date: toDateKey(new Date()),
				notes: "Transfer before closing account",
			});
		}
		db.update(accounts)
			.set({ closed_at: new Date().toISOString() })
			.where(eq(accounts.id, id))
			.run();
	});
}

/**
 * Permanently deletes an account and every transaction it owns (cascade).
 * Irreversible - callers must confirm with the user first, including how
 * many transactions will be destroyed (see lib/account.ts countAccountTransactions).
 */
export function deleteAccountRecord(id: string) {
	db.delete(accounts).where(eq(accounts.id, id)).run();
}
