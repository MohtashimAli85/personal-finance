// Entry point for bank email parsing. The per-bank rules live in
// lib/bank-parsers/ - see that folder's index.ts to register a new bank.
import { parseBankEmail } from "@/lib/bank-parsers";
import { normalizeDate } from "@/lib/bank-parsers/helpers";
import type { BankEmail, ParsedBankTransaction } from "@/lib/bank-parsers/types";

export { formatAccountTitle } from "@/lib/bank-parsers/helpers";
export { listTemplates, parseBankEmail } from "@/lib/bank-parsers";
export type {
	BankEmail,
	ParseFailure,
	ParsedBankTransaction,
	ParseOutcome,
} from "@/lib/bank-parsers/types";

/** Parses a date string found in an email body into an ISO timestamp. */
export function normalizeEmailDate(raw: string): string | null {
	return normalizeDate(raw);
}

/**
 * Convenience wrapper for callers that only have the body text. Prefer
 * `parseBankEmail`, which can also use the sender and the header date.
 */
export function parseBankTransaction(
	text: string,
	email: Partial<Omit<BankEmail, "body">> = {},
): ParsedBankTransaction | null {
	return parseBankEmail({
		from: email.from ?? null,
		subject: email.subject ?? null,
		receivedAt: email.receivedAt ?? null,
		body: text,
	}).transaction;
}
