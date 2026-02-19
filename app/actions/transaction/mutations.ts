"use server";
import { revalidatePath, updateTag } from "next/cache";
import db from "@/app/actions/database";

function toNumberDate(input: FormDataEntryValue | null): number {
	if (!input) return Date.now();
	const s = String(input);
	const n = Number(s);
	if (!Number.isNaN(n)) return n;
	const parsed = Date.parse(s);
	return Number.isNaN(parsed) ? Date.now() : parsed;
}

function updateAccountBalance(
	accountId?: string,
	payment?: number,
	deposit?: number,
	reverse = false,
) {
	if (!accountId) return;
	if (payment) {
		const amount = reverse ? Math.abs(payment) : -Math.abs(payment);
		db.prepare(`UPDATE accounts SET balance = balance + ? WHERE id = ?`).run(
			amount,
			accountId,
		);
		return amount;
	}
	if (deposit) {
		const amount = reverse ? -Math.abs(deposit) : Math.abs(deposit);
		db.prepare(`UPDATE accounts SET balance = balance + ? WHERE id = ?`).run(
			amount,
			accountId,
		);
		return amount;
	}
}

function revalidateAll() {
	// revalidatePath("/transactions");
	updateTag("accounts");
	updateTag("transactions");
}
export async function updateTransactionColumn(
	id: string,
	column: keyof Omit<Transaction, "id">,
	value: Transaction[keyof Omit<Transaction, "id">],
) {
	const existing = db
		.prepare(`SELECT account_id FROM transactions WHERE id = ?`)
		.get(id) as { account_id: string };

	if (!existing) return;

	const accountId = existing.account_id;

	db.transaction(() => {
		const tx = db
			.prepare(`SELECT payment, deposit FROM transactions WHERE id = ?`)
			.get(id) as { payment: number; deposit: number } | undefined;

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
			if (tx?.deposit) {
				updateAccountBalance(accountId, 0, tx.deposit, true); // Reverse old deposit
			}
			if (tx?.payment) {
				updateAccountBalance(accountId, tx.payment, 0, true); // Reverse old payment
			}
			updateAccountBalance(accountId, value as number); // Apply new payment
			db.prepare(
				`
        UPDATE transactions
        SET payment = ?, deposit = NULL
        WHERE id = ?
      `,
			).run(value, id);
		} else if (column === "deposit") {
			if (tx?.payment) {
				updateAccountBalance(accountId, tx.payment, 0, true); // Reverse old payment
			}
			if (tx?.deposit) {
				updateAccountBalance(accountId, 0, tx.deposit, true); // Reverse old deposit
			}
			updateAccountBalance(accountId, 0, value as number); // Apply new deposit
			db.prepare(
				`
        UPDATE transactions
        SET deposit = ?, payment = NULL
        WHERE id = ?
      `,
			).run(value, id);
		} else {
			// Fallback for other columns
			db.prepare(
				`
        UPDATE transactions
        SET ${column} = ?
        WHERE id = ?
      `,
			).run(value, id);
		}
	})();
	revalidateAll();
}
export async function createTransaction(tx: Omit<Transaction, "id">) {
	db.transaction(() => {
		db.prepare(
			`
      INSERT INTO transactions (payment, deposit, date, account_id, category_id, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
		).run(
			tx.payment,
			tx.deposit,
			tx.date,
			tx.account_id,
			tx.category_id,
			tx.notes,
		);
		if (tx.account_id) {
			updateAccountBalance(tx.account_id, tx.payment, tx.deposit);
		}
	})();
	revalidateAll();
}

export async function updateTransaction(formData: FormData) {
	const payment = parseFloat(String(formData.get("payment") ?? "0"));
	const deposit = parseFloat(String(formData.get("deposit") ?? "0"));
	const id = String(formData.get("id"));
	const newDate = toNumberDate(formData.get("date"));
	const newAccountId = (formData.get("accountId") as string) ?? null;
	const newCategoryId = (formData.get("categoryId") as string) ?? null;
	const newNotes = (formData.get("notes") as string) ?? null;

	const existing = db
		.prepare(
			`SELECT account_id, payment, deposit FROM transactions WHERE id = ?`,
		)
		.get(id) as
		| { account_id: string | null; payment: number; deposit: number }
		| undefined;

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
		db.prepare(
			`
      UPDATE transactions
      SET payment = ?, deposit = ?, date = ?, account_id = ?, category_id = ?, notes = ?
      WHERE id = ?
    `,
		).run(payment, deposit, newDate, newAccountId, newCategoryId, newNotes, id);
	})();
	revalidateAll();
}

export async function deleteTransaction(formData: FormData) {
	const id = String(formData.get("id"));

	const tx = db
		.prepare(
			`SELECT payment,deposit, account_id FROM transactions WHERE id = ?`,
		)
		.get(id) as Transaction;

	// if (!tx) return;

	db.transaction(() => {
		// Reverse balance impact before deleting
		if (tx.account_id) {
			updateAccountBalance(tx.account_id, tx.payment, tx.deposit, true);
		}
		db.prepare(`DELETE FROM transactions WHERE id = ?`).run(id);
	})();

	revalidateAll();
}

export async function bulkDeleteTransactions(ids: string[]) {
	if (!ids || ids.length === 0) return;

	const transactions = db
		.prepare(
			`SELECT id, payment, deposit, account_id FROM transactions WHERE id IN (${ids.map(() => "?").join(",")})`,
		)
		.all(...ids) as Array<{
		id: string;
		payment: number;
		deposit: number;
		account_id: string | null;
	}>;

	if (!transactions || transactions.length === 0) return;

	db.transaction(() => {
		// Reverse balance impact for each transaction
		for (const tx of transactions) {
			if (tx.account_id) {
				updateAccountBalance(tx.account_id, tx.payment, tx.deposit, true);
			}
		}

		// Delete all transactions at once
		db.prepare(
			`DELETE FROM transactions WHERE id IN (${ids.map(() => "?").join(",")})`,
		).run(...ids);
	})();

	revalidateAll();
}
