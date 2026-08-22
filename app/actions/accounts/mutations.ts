"use server";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { AccountValues } from "@/components/accounts/schema";
import { db } from "@/lib/db";
import { accounts, transactions } from "@/lib/db/schema";

const revalidateAccounts = () => {
	revalidatePath("/");
	revalidatePath("/transactions");
	revalidatePath("/budget");
};

export async function createAccount(
	_previousState: ActionState,
	payload: AccountValues,
) {
	const existingAccount = db
		.select({ id: accounts.id })
		.from(accounts)
		.where(eq(accounts.name, payload.name))
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
		db.transaction(() =>
			db
				.insert(accounts)
				.values({
					id: crypto.randomUUID(),
					name: payload.name,
					balance: payload.initialBalance,
					account_type: accountType,
				})
				.run(),
		);
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
	db.transaction(() =>
		db.update(accounts).set({ name }).where(eq(accounts.id, id)).run(),
	);
	revalidateAccounts();
}

export async function closeAccount(formData: FormData) {
	const id = formData.get("id") as string;
	const transferAccountId = formData.get("account_id") as string;
	db.transaction(() => {
		if (transferAccountId && transferAccountId !== id) {
			db.update(transactions)
				.set({ account_id: transferAccountId })
				.where(eq(transactions.account_id, id))
				.run();

			const source = db
				.select({ balance: accounts.balance })
				.from(accounts)
				.where(eq(accounts.id, id))
				.get();
			if (source) {
				db.update(accounts)
					.set({
						balance: sql`coalesce(${accounts.balance}, 0) + coalesce(${source.balance}, 0)`,
					})
					.where(eq(accounts.id, transferAccountId))
					.run();
			}
		}
		db.delete(accounts).where(eq(accounts.id, id)).run();
	});
	revalidateAccounts();
}

export async function forceCloseAccount(id: string) {
	db.transaction(() => db.delete(accounts).where(eq(accounts.id, id)).run());
	revalidateAccounts();
}
