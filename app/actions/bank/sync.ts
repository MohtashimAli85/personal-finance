"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { applyBalanceDelta, balanceEffect, signedAmount } from "@/lib/balance";
import { parseBankEmail } from "@/lib/bank-email-parse";
import {
	hashEmailId,
	resolveAccountId,
	toBankEmail,
	transactionFields,
} from "@/lib/bank-import";
import { cachedAiTransaction } from "@/lib/bank-parsers/ai";
import { db } from "@/lib/db";
import { type gmail_messages, transactions } from "@/lib/db/schema";
import {
	type BankSenderConfig,
	getEnabledBankSenderConfigs,
	matchSenderConfig,
} from "@/lib/mail/bank-sender-config";
import { getMailCredentials } from "@/lib/mail/credentials";
import {
	getAllEmails,
	getStoredEmailIds,
	markEmailsProcessed,
	upsertEmails,
} from "@/lib/mail/gmail-store";
import { fetchNewEmails } from "@/lib/mail/imap";

async function syncEmailsToDb(configs: BankSenderConfig[]): Promise<void> {
	const credentials = getMailCredentials();
	if (!credentials) {
		throw new Error("Connect your Gmail with an app password first.");
	}
	const emails = await fetchNewEmails(
		credentials,
		configs.map((c) => c.senderEmail),
		getStoredEmailIds(),
	);
	upsertEmails(emails);
}

// ============================================================================
// Read emails locally, convert to bank transactions
// ============================================================================
interface ImportResult {
	inserted: number;
	fetched: number;
}

// Walks stored emails and materialises any bank transaction not yet recorded.
// Safe to run over already-processed emails: the per-message hash makes it
// idempotent. A cached AI reading wins over the regex one, so a re-import never
// reverts a refined name.
async function importTransactions(
	emails: (typeof gmail_messages.$inferSelect)[],
	configs: BankSenderConfig[],
	{ repairDescriptions = false }: { repairDescriptions?: boolean } = {},
): Promise<ImportResult> {
	const known = new Map(
		db
			.select({ hash: transactions.external_hash, notes: transactions.notes })
			.from(transactions)
			.where(eq(transactions.source, "email"))
			.all()
			.filter((row): row is { hash: string; notes: string | null } =>
				Boolean(row.hash),
			)
			.map((row) => [row.hash, row.notes] as const),
	);

	let inserted = 0;
	let fetched = 0;
	const processedIds: string[] = [];

	for (const email of emails) {
		const config = matchSenderConfig(email.from, configs);
		if (!config) continue;

		const tx =
			cachedAiTransaction(email.ai_parse) ??
			parseBankEmail(toBankEmail(email)).transaction;
		if (!tx) continue;
		fetched += 1;

		const hash = await hashEmailId(email.id);
		if (known.has(hash)) {
			processedIds.push(email.id);
			// An improved parser or AI pass can produce a better description for an
			// email already imported - update it in place rather than duplicating it.
			if (repairDescriptions && known.get(hash) !== tx.description) {
				db.update(transactions)
					.set({ notes: tx.description })
					.where(eq(transactions.external_hash, hash))
					.run();
			}
			continue;
		}
		known.set(hash, tx.description);

		db.insert(transactions)
			.values({
				id: crypto.randomUUID(),
				account_id: resolveAccountId(config),
				...transactionFields(tx),
				source: "email",
				external_hash: hash,
				// Lands in the bank-transactions review queue; it affects neither
				// the budget nor the account balance until accepted.
				status: "pending",
			})
			.run();
		inserted += 1;
		processedIds.push(email.id);
	}

	markEmailsProcessed(processedIds);
	return { inserted, fetched };
}

export async function syncBankTransactions(): Promise<
	| { success: true; inserted: number; fetched: number }
	| { success: false; error: string }
> {
	try {
		const configs = getEnabledBankSenderConfigs();
		if (configs.length === 0) {
			throw new Error(
				"No bank sender configured yet. Add one below to start importing.",
			);
		}

		await syncEmailsToDb(configs);
		// Re-derives over every stored email, not just the unprocessed ones, so a
		// mis-parsed description from an earlier run is repaired too.
		const { inserted, fetched } = await importTransactions(
			getAllEmails(),
			configs,
			{ repairDescriptions: true },
		);

		revalidatePath("/bank-transactions");
		return { success: true, inserted, fetched };
	} catch (error) {
		console.error("Bank sync error:", error);
		revalidatePath("/bank-transactions");
		return {
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to fetch bank emails",
		};
	}
}

// ============================================================================
// Review queue: pending imports don't reach the budget until accepted.
// ============================================================================

/** Accepts a pending imported transaction into the ledger, optionally
 * assigning a category so it counts toward budget activity immediately. */
export async function acceptBankTransaction(
	id: string,
	categoryId?: string | null,
) {
	const tx = db
		.select({
			payment: transactions.payment,
			deposit: transactions.deposit,
			account_id: transactions.account_id,
			status: transactions.status,
		})
		.from(transactions)
		.where(eq(transactions.id, id))
		.get();
	if (!tx) return;
	db.transaction(() => {
		db.update(transactions)
			.set({
				status: "cleared",
				...(categoryId !== undefined
					? { category_id: categoryId || null }
					: {}),
			})
			.where(eq(transactions.id, id))
			.run();
		if (tx.status === "pending") {
			applyBalanceDelta(tx.account_id, signedAmount(tx.payment, tx.deposit));
		}
	});
	revalidatePath("/bank-transactions");
	revalidatePath("/budget");
	revalidatePath("/transactions");
	revalidatePath("/");
}

export async function bulkAcceptBankTransactions(
	ids: string[],
	categoryId?: string | null,
) {
	if (!ids.length) return;
	const rows = db
		.select({
			id: transactions.id,
			payment: transactions.payment,
			deposit: transactions.deposit,
			account_id: transactions.account_id,
			status: transactions.status,
		})
		.from(transactions)
		.where(inArray(transactions.id, ids))
		.all();
	db.transaction(() => {
		for (const tx of rows) {
			db.update(transactions)
				.set({
					status: "cleared",
					...(categoryId ? { category_id: categoryId } : {}),
				})
				.where(eq(transactions.id, tx.id))
				.run();
			if (tx.status === "pending") {
				applyBalanceDelta(tx.account_id, signedAmount(tx.payment, tx.deposit));
			}
		}
	});
	revalidatePath("/bank-transactions");
	revalidatePath("/budget");
	revalidatePath("/transactions");
	revalidatePath("/");
}

/** Rejects a pending imported transaction: removes it from the ledger. */
export async function rejectBankTransaction(id: string) {
	const tx = db
		.select({
			payment: transactions.payment,
			deposit: transactions.deposit,
			account_id: transactions.account_id,
			status: transactions.status,
		})
		.from(transactions)
		.where(eq(transactions.id, id))
		.get();
	if (!tx) return;
	db.transaction(() => {
		applyBalanceDelta(tx.account_id, -balanceEffect(tx));
		db.delete(transactions).where(eq(transactions.id, id)).run();
	});
	revalidatePath("/bank-transactions");
	revalidatePath("/");
}
