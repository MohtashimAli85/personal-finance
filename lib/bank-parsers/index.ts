import { looksLikeTransaction } from "./helpers";
import { parseTransaction } from "./parse";
import type { BankEmail, ParseOutcome } from "./types";

export function parseBankEmail(email: BankEmail): ParseOutcome {
	const transaction = parseTransaction(email);
	if (transaction) return { transaction };

	return {
		transaction: null,
		// Distinguishes "this was never a transaction" (login alert, promo)
		// from "this reads like one but we failed" - only the latter is a bug.
		failure: looksLikeTransaction(`${email.subject ?? ""} ${email.body}`)
			? "unrecognized-format"
			: "not-a-transaction",
	};
}

export type {
	BankEmail,
	ParsedBankTransaction,
	ParseFailure,
	ParseOutcome,
} from "./types";
