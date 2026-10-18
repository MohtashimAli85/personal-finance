import { extractAmountMatch, formatAccountTitle, resolveDate } from "./helpers";
import type { BankEmail, BankTemplate, ParsedBankTransaction } from "./types";

const SUBJECT_PATTERNS: {
	pattern: RegExp;
	type: ParsedBankTransaction["type"];
}[] = [
	{ pattern: /^You spent (Rs\.?\s*[\d,.]+) at (.+)$/i, type: "expense" },
	{ pattern: /^You sent (Rs\.?\s*[\d,.]+) to (.+)$/i, type: "expense" },
	{ pattern: /^(Rs\.?\s*[\d,.]+) added from (.+?)!?$/i, type: "income" },
];

const stripDecoration = (text: string) =>
	text
		.replace(/[\p{Extended_Pictographic}‍️]/gu, "")
		.replace(/!+\s*$/, "")
		.trim();

export const nayapayTemplate: BankTemplate = {
	id: "nayapay",
	label: "NayaPay",

	matches(email: BankEmail) {
		return (email.from ?? "").toLowerCase().includes("nayapay");
	},

	parse(email: BankEmail): ParsedBankTransaction | null {
		const subject = stripDecoration(email.subject ?? "");
		for (const { pattern, type } of SUBJECT_PATTERNS) {
			const match = subject.match(pattern);
			if (!match) continue;
			const amount = extractAmountMatch(match[1])?.amount;
			const date = resolveDate(null, email.receivedAt);
			if (!amount || !date) return null;
			return {
				amount,
				date,
				type,
				description: formatAccountTitle(match[2]) || "NayaPay",
			};
		}
		return null;
	},
};
