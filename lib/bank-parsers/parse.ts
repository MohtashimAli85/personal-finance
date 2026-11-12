import {
	buildFieldStop,
	detectDirectionBeside,
	detectDirectionNear,
	extractAmountMatch,
	extractLabeledField,
	formatAccountTitle,
	normalizeDate,
	resolveDate,
} from "./helpers";
import type { BankEmail, ParsedBankTransaction } from "./types";

// Label vocabulary shared by most bank alert emails. Labels run together on one
// line, so each one also marks where the previous field's value ends.
const LABELS = [
	"Mode",
	"Merchant(?:\\s+Name)?",
	"Terminal(?:\\s+Name)?",
	"Beneficiary(?:\\s+Account)?(?:\\s+Title)?(?:\\s+Name)?",
	"Payee(?:\\s+Name)?",
	"Recipient(?:\\s+Name)?",
	"To\\s+Account",
	"From\\s+Account",
	"Account(?:\\s+Number)?",
	"Branch",
	"Description",
	"Narration",
	"Particulars",
	"Reference(?:\\s+(?:No|Number|ID))?",
	"Transaction\\s+(?:Date|Time|ID|Ref|Reference|Type|Amount)",
	"Date(?:\\s+and\\s+Time)?",
	"Time",
	"Amount",
	"Available\\s+Balance",
	"Balance",
	"Fee",
	"Charges",
];

const FIELD_STOP = buildFieldStop(LABELS);

// At least one of these must appear for the mail to be treated as an account
// alert at all.
const BANKING_CONTEXT =
	/\b(account|a\/c|card|balance|transaction|txn|transfer|wallet|atm|statement|debited|credited)\b/i;

const DESCRIPTION_FIELDS = [
	"Merchant(?:\\s+Name)?",
	"Payee(?:\\s+Name)?",
	"Recipient(?:\\s+Name)?",
	"Beneficiary\\s+Account\\s+Title",
	"Beneficiary(?:\\s+Account)?(?:\\s+Name)?",
	"Narration",
	"Particulars",
	"Description",
	"Terminal(?:\\s+Name)?",
	"To\\s+Account",
	"Mode",
];

const DATE_FIELDS = [
	"Transaction\\s+Date",
	"Date\\s+and\\s+Time",
	"Value\\s+Date",
	"Date",
];

function describe(text: string): string {
	for (const label of DESCRIPTION_FIELDS) {
		const value = extractLabeledField(text, label, FIELD_STOP);
		if (!value) continue;
		const formatted = formatAccountTitle(value);
		if (formatted && formatted !== "Bank Transaction") return formatted;
	}

	// Unlabeled phrasing: "... at SHELL PETROL on ...", "... to JOHN SMITH."
	const inline = text.match(
		/\b(?:at|to|from|by|towards)\s+([A-Z0-9&.'-]{2,}(?:\s+[A-Z0-9&.'-]+){0,4})/,
	);
	if (inline?.[1]) {
		const formatted = formatAccountTitle(inline[1]);
		if (formatted && formatted !== "Bank Transaction") return formatted;
	}

	return "Bank Transaction";
}

function parseBody(email: BankEmail): ParsedBankTransaction | null {
	const text = email.body;

	// Without a banking noun this is not an account alert. Job ads quoting
	// salaries and newsletters quoting prices otherwise sail through.
	if (!BANKING_CONTEXT.test(text)) return null;

	const match = extractAmountMatch(text);
	if (!match) return null;

	// The debit/credit word has to sit beside the amount, not merely appear
	// somewhere in the mail - that is what keeps marketing copy out.
	const type = detectDirectionNear(text, match.index);
	if (!type) return null;

	let bodyDate: string | null = null;
	for (const label of DATE_FIELDS) {
		bodyDate = normalizeDate(extractLabeledField(text, label, FIELD_STOP));
		if (bodyDate) break;
	}
	const date = resolveDate(bodyDate ?? normalizeDate(text), email.receivedAt);
	if (!date) return null;

	return { amount: match.amount, date, type, description: describe(text) };
}

const DECORATION = /\p{Extended_Pictographic}|\u200D|\uFE0F/gu;

// Wallet apps put the whole alert in the subject ("You sent Rs. 750 to Ahmed
// Khan") and fill the body with marketing, so the subject is read first.
function parseSubject(email: BankEmail): ParsedBankTransaction | null {
	const subject = (email.subject ?? "")
		.replace(DECORATION, "")
		.replace(/!+\s*$/, "")
		.trim();
	const match = extractAmountMatch(subject);
	if (!match) return null;

	const type = detectDirectionBeside(subject, match.index);
	const counterparty = subject
		.slice(match.index)
		.match(/\b(?:to|at|from)\s+(.+)$/i)?.[1];
	if (!type || !counterparty || /^your\b/i.test(counterparty)) return null;

	const date = resolveDate(null, email.receivedAt);
	if (!date) return null;

	return {
		amount: match.amount,
		date,
		type,
		description: formatAccountTitle(counterparty),
	};
}

export const parseTransaction = (email: BankEmail) =>
	parseSubject(email) ?? parseBody(email);
