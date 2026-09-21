import { genericTemplate } from "./generic";
import { looksLikeTransaction } from "./helpers";
import { meezanTemplate } from "./meezan";
import type { BankEmail, BankTemplate, ParseOutcome } from "./types";

// Bank-specific templates first, generic fallback last. To support a new bank
// that the generic rules mis-read, add a template file and register it here.
const TEMPLATES: BankTemplate[] = [meezanTemplate, genericTemplate];

export function listTemplates(): { id: string; label: string }[] {
	return TEMPLATES.map(({ id, label }) => ({ id, label }));
}

export function parseBankEmail(email: BankEmail): ParseOutcome {
	for (const template of TEMPLATES) {
		if (!template.matches(email)) continue;

		const transaction = template.parse(email);
		if (transaction) return { transaction, templateId: template.id };

		// A bank template that recognises the sender but cannot parse this
		// particular mail should not block the generic rules from trying.
		if (template.id !== genericTemplate.id) continue;
	}

	return {
		transaction: null,
		templateId: "none",
		// Distinguishes "this was never a transaction" (login alert, promo)
		// from "this reads like one but we failed" - only the latter is a bug.
		failure: looksLikeTransaction(email.body)
			? "unrecognized-format"
			: "not-a-transaction",
	};
}

export type {
	BankEmail,
	BankTemplate,
	ParsedBankTransaction,
	ParseFailure,
	ParseOutcome,
} from "./types";
