import { eq } from "drizzle-orm";
import type {
	BankEmail,
	ParsedBankTransaction,
} from "@/lib/bank-parsers/types";
import { toDateKey } from "@/lib/date";
import { db } from "@/lib/db";
import { accounts, type gmail_messages } from "@/lib/db/schema";
import type { BankSenderConfig } from "@/lib/mail/bank-sender-config";
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
	db.insert(accounts)
		.values({ id, name: config.accountName, balance: 0 })
		.run();
	return id;
}
