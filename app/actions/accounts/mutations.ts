"use server";
import { updateTag } from "next/cache";
import db from "@/app/actions/database";
import type { AccountValues } from "@/components/accounts/schema";

const revalidateAccounts = () => {
	updateTag("accounts");
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
			"INSERT INTO accounts (name, balance) VALUES (?, ?)",
		);
		db.transaction(() => stmt.run(payload.name, payload.initialBalance))();
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
}

export async function closeAccount(formData: FormData) {
	const id = formData.get("id") as string;
	const transferAccountId = formData.get("account_id") as string;
	if (transferAccountId) {
		const transferStmt = db.prepare(
			"UPDATE transactions SET account_id = ? WHERE account_id = ?",
		);
		db.transaction(() => transferStmt.run(transferAccountId, id))();
	}
	const stmt = db.prepare("DELETE FROM accounts WHERE id = ?");
	db.transaction(() => stmt.run(id))();
	revalidateAccounts();
}

export async function forceCloseAccount(id: string) {
	const stmt = db.prepare("DELETE FROM accounts WHERE id = ?");
	db.transaction(() => stmt.run(id))();
	revalidateAccounts();
}
