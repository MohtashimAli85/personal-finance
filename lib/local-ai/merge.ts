import { parseBankEmail } from "@/lib/bank-parsers";
import { toTransaction } from "@/lib/bank-parsers/ai";
import { isNotice, normalizeDate } from "@/lib/bank-parsers/helpers";
import type {
	BankEmail,
	ParsedBankTransaction,
} from "@/lib/bank-parsers/types";

export interface LocalAnswer {
	amount: number | null;
	type: "income" | "expense" | null;
	counterparty: string | null;
	isTransaction: boolean;
}

const GENERIC = "Bank Transaction";

const flatten = (text: string) => text.replace(/\s+/g, " ").toLowerCase();

const MASKED = /x{2,}\d|\d{6,}|@|\bA\/C\b/i;
const NOT_A_NAME =
	/^(?:RAAST|IBFT|IMPS|NEFT|RTGS|UPI|VPA|POS|ATM)$|\b(?:BR|BRANCH)\b/i;

const letters = (text: string) => text.toLowerCase().replace(/[^a-z]/g, "");

// The model often names the sender itself ("Meezan Bank Limited" in a mail
// from meezanbank.com) instead of the merchant or person.
function isSender(email: BankEmail, name: string) {
	const domain = letters(email.from?.match(/@([\w-]+)/)?.[1] ?? "");
	const candidate = letters(name);
	return (
		flatten(email.from ?? "").includes(flatten(name)) ||
		(domain.length > 2 &&
			(candidate.includes(domain) || domain.includes(candidate)))
	);
}

// A small model can invent names, echo the sender, a masked account or a
// payment rail, so only a real name copied from the mail is trusted.
function verifiedCounterparty(email: BankEmail, name: string | null) {
	const trimmed = name?.trim().replace(/[.,]+$/, "");
	if (
		!trimmed ||
		trimmed.length < 2 ||
		MASKED.test(trimmed) ||
		NOT_A_NAME.test(trimmed) ||
		isSender(email, trimmed)
	) {
		return null;
	}
	const source = flatten(`${email.subject ?? ""} ${email.body}`);
	return source.includes(flatten(trimmed)) ? trimmed : null;
}

// Whole-number match, so 25 is not found inside "2,500.00".
function amountInEmail(email: BankEmail, amount: number) {
	const [whole, fraction] = String(amount).split(".");
	const decimals = fraction ? `\\.${fraction}0*` : "(?:\\.0+)?";
	return new RegExp(`(?<![\\d.])${whole}${decimals}(?![\\d])`).test(
		`${email.subject ?? ""} ${email.body}`.replace(/,/g, ""),
	);
}

/** A transaction built from the model answer alone, keeping only verified values. */
export function fromModel(
	email: BankEmail,
	answer: LocalAnswer,
): ParsedBankTransaction | null {
	if (
		isNotice(email) ||
		answer.amount === null ||
		!amountInEmail(email, answer.amount)
	) {
		return null;
	}
	const date = normalizeDate(email.body)?.slice(0, 10) ?? null;
	const counterparty = verifiedCounterparty(email, answer.counterparty);
	return toTransaction(
		{ ...answer, date, counterparty: counterparty ?? GENERIC },
		email,
	);
}

/**
 * Combines the regex parser with an on-device model answer. The regex parser
 * owns amount, date and direction when it reads the mail; the model fills the
 * counterparty, and the whole transaction only when the regex parser fails.
 */
export function mergeLocalResult(
	email: BankEmail,
	answer: LocalAnswer,
): ParsedBankTransaction | null {
	const parsed = parseBankEmail(email).transaction;
	if (!parsed) return fromModel(email, answer);
	const counterparty = verifiedCounterparty(email, answer.counterparty);
	return counterparty ? { ...parsed, description: counterparty } : parsed;
}
