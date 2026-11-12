export interface BankEmail {
	from: string | null;
	subject: string | null;
	body: string;
	/** Header date, used when the body carries no transaction date. */
	receivedAt?: string | null;
}

export interface ParsedBankTransaction {
	amount: number;
	/** ISO timestamp, normalized to midday UTC like the rest of the app. */
	date: string;
	type: "income" | "expense";
	description: string;
}

export type ParseFailure =
	// No amount or no debit/credit wording: a login alert, promo, statement
	// notice. Expected, and not worth reporting.
	| "not-a-transaction"
	// Reads like a transaction (amount + direction) but a field could not be
	// extracted. This is a parser gap and must be surfaced, never swallowed.
	| "unrecognized-format";

export interface ParseOutcome {
	transaction: ParsedBankTransaction | null;
	failure?: ParseFailure;
}
