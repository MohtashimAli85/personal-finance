"use server";
import { revalidatePath } from "next/cache";
import db from "@/app/actions/database";
import type { AccountValues } from "@/components/accounts/schema";

const revalidateAccounts = () => {
	revalidatePath("/");
	revalidatePath("/transactions");
	revalidatePath("/budget");
};

export async function createAccount(
	_previousState: ActionState,
	payload: AccountValues,
) {
	const doesNameExist =
		(
			db
				.prepare(
					"SELECT EXISTS(SELECT 1 FROM accounts WHERE name = ?) as 'exists'",
				)
				.get(payload.name) as { exists: number }
		).exists === 1;
	if (doesNameExist) {
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
		const stmt = db.prepare(
			"INSERT INTO accounts (id, name, balance, account_type) VALUES (?, ?, ?, ?)",
		);
		const accountType = payload.offBudget ? "off_budget" : "on_budget";
		db.transaction(() =>
			stmt.run(
				crypto.randomUUID(),
				payload.name,
				payload.initialBalance,
				accountType,
			),
		)();
		revalidateAccounts();
		return {
			message: "Account created successfully!",
			success: true,
		};
	} catch (error) {
		console.error("Error creating account:", error);
		return {
			message: "Failed to create account. Please try again.",
			success: false,
		};
	}
}

export async function updateAccount(id: string, name: string) {
	const stmt = db.prepare("UPDATE accounts SET name = ? WHERE id = ?");
	db.transaction(() => stmt.run(name, id))();
	revalidateAccounts();
	// updateTag(`accounts/${id}`);
}

export async function closeAccount(formData: FormData) {
	const id = formData.get("id") as string;
	const transferAccountId = formData.get("account_id") as string;
	db.transaction(() => {
		if (transferAccountId && transferAccountId !== id) {
			const transferStmt = db.prepare(
				"UPDATE transactions SET account_id = ? WHERE account_id = ?",
			);
			transferStmt.run(transferAccountId, id);

			const source = db
				.prepare("SELECT balance FROM accounts WHERE id = ?")
				.get(id) as { balance: number } | undefined;
			if (source) {
				db.prepare(
					"UPDATE accounts SET balance = balance + ? WHERE id = ?",
				).run(source.balance, transferAccountId);
			}
		}
		const stmt = db.prepare("DELETE FROM accounts WHERE id = ?");
		stmt.run(id);
	})();
	revalidateAccounts();
}

export async function forceCloseAccount(id: string) {
	const stmt = db.prepare("DELETE FROM accounts WHERE id = ?");
	db.transaction(() => stmt.run(id))();
	revalidateAccounts();
}
