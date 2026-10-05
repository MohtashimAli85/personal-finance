import {
	buildFieldStop,
	detectDirectionNear,
	extractAmountMatch,
	extractLabeledField,
	formatAccountTitle,
	normalizeDate,
	resolveDate,
} from "./helpers";
import type { BankEmail, BankTemplate, ParsedBankTransaction } from "./types";

// Labels Meezan uses inline; any of them terminates the previous field.
const LABELS = [
	"Mode",
	"Merchant\\s+Name",
	"Terminal\\s+Name",
	"Beneficiary\\s+Account\\s+Title",
	"Beneficiary\\s+Account",
	"Beneficiary\\s+Name",
	"Beneficiary",
	"Branch",
	"Transaction\\s+(?:Date|Time|ID|Ref)",
	"Fee",
];

const FIELD_STOP = buildFieldStop(LABELS);

// Ordered most- to least-specific: whoever was actually paid wins, and the
// payment rail (Mode) is only used when nothing better is present.
const DESCRIPTION_FIELDS = [
	"Merchant\\s+Name",
	"Beneficiary\\s+Account\\s+Title",
	"Beneficiary\\s+Account",
	"Beneficiary\\s+Name",
	"Terminal\\s+Name",
	"Mode",
];

function describe(text: string): string {
	for (const label of DESCRIPTION_FIELDS) {
		const value = extractLabeledField(text, label, FIELD_STOP);
		if (!value) continue;
		const formatted = formatAccountTitle(value);
		if (formatted && formatted !== "Bank Transaction") return formatted;
	}

	// Fallback: "at <Merchant>" or "to <Account>"
	const fallback = text.match(
		/(?:at|to)\s+([A-Z0-9&.'\s]+?)(?=\s+on|\s+using|\.|$)/i,
	);
	if (fallback?.[1]) return formatAccountTitle(fallback[1]);

	return "Bank Transaction";
}

export const meezanTemplate: BankTemplate = {
	id: "meezan",
	label: "Meezan Bank",

	matches(email: BankEmail) {
		const haystack =
			`${email.from ?? ""} ${email.subject ?? ""} ${email.body}`.toLowerCase();
		return haystack.includes("meezan");
	},

	parse(email: BankEmail): ParsedBankTransaction | null {
		const text = email.body;
		const match = extractAmountMatch(text);
		if (!match) return null;
		const { amount } = match;

		const direction = detectDirectionNear(text, match.index);
		if (!direction) return null;

		const date = resolveDate(
			normalizeDate(extractLabeledField(text, "Transaction\\s+Date", FIELD_STOP)) ??
				normalizeDate(text),
			email.receivedAt,
		);
		if (!date) return null;

		return { amount, date, type: direction, description: describe(text) };
	},
};
