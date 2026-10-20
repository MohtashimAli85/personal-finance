import { eq } from "drizzle-orm";
import { parseBankEmail } from "@/lib/bank-email-parse";
import { cachedAiTransaction } from "@/lib/bank-parsers/ai";
import type {
	BankEmail,
	ParsedBankTransaction,
} from "@/lib/bank-parsers/types";
import { toDateKey } from "@/lib/date";
import { db } from "@/lib/db";
import { accounts, type gmail_messages, transactions } from "@/lib/db/schema";
import {
	type BankSenderConfig,
	matchSenderConfig,
} from "@/lib/mail/bank-sender-config";
import { markEmailsProcessed } from "@/lib/mail/gmail-store";
import { toCents } from "@/lib/money";

// Hashes the Gmail message id (rather than the parsed date/amount/description)
// so distinct transactions of the same amount on the same day - e.g. two
// separate PKR 20,000 ATM withdrawals in one sitting - aren't mistaken for
// duplicates and silently dropped. Each bank email is one real transaction.
export async function hashEmailId(emailId: string) {
	const data = new TextEncoder().encode(emailId);
	const digest = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

// Gives the parser the sender and a usable received date, so an alert whose
// body omits a date can still be dated from the message itself.
export function toBankEmail(
	email: typeof gmail_messages.$inferSelect,
): BankEmail {
	const epoch = Number(email.internal_date);
	return {
		from: email.from,
		subject: email.subject,
		body: email.body_text ?? "",
		receivedAt:
			email.date ??
			(Number.isFinite(epoch) && epoch > 0
				? new Date(epoch).toISOString()
				: null),
	};
}

export function transactionFields(tx: ParsedBankTransaction) {
	const cents = toCents(tx.amount);
	return {
		payment: tx.type === "expense" ? cents : null,
		deposit: tx.type === "income" ? cents : null,
		date: toDateKey(tx.date),
		notes: tx.description,
	};
}

// Fallback only - normally every enabled sender config already carries a
// resolved account_id (see lib/mail/bank-sender-config.ts).
export function resolveAccountId(config: BankSenderConfig): string {
	if (config.accountId) return config.accountId;

	const existing = db
		.select({ id: accounts.id })
		.from(accounts)
		.where(eq(accounts.name, config.accountName))
		.get();
	if (existing) return existing.id;

	const id = crypto.randomUUID();
	db.insert(accounts).values({ id, name: config.accountName }).run();
	return id;
}

// Walks stored emails and materialises any bank transaction not yet recorded.
// Safe to run over already-processed emails: the per-message hash makes it
// idempotent. A cached AI reading wins over the regex one, so a re-import never
// reverts a refined name. With repairDescriptions, an email already imported
// gets the better description in place rather than a duplicate row.
export async function importEmailTransactions(
	emails: (typeof gmail_messages.$inferSelect)[],
	configs: BankSenderConfig[],
	{ repairDescriptions = false }: { repairDescriptions?: boolean } = {},
): Promise<{ inserted: number; fetched: number }> {
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
