import type { LanguageModelV4 } from "@ai-sdk/provider";
import { generateText, Output } from "ai";
import { z } from "zod";
import { isDateKey } from "@/lib/date";
import { resolveDate } from "./helpers";
import type { BankEmail, ParsedBankTransaction } from "./types";

// Every field is required and nullable so the schema also satisfies providers
// that enforce strict JSON schemas (Groq).
const extractionSchema = z.object({
	isTransaction: z.boolean(),
	amount: z.number().nullable(),
	date: z.string().nullable(),
	type: z.enum(["income", "expense"]).nullable(),
	counterparty: z.string().nullable(),
});

const INSTRUCTIONS = `Extract a single completed bank transaction from a bank notification email.
- amount: the transaction amount as a positive number in major units (PKR 1,250.50 -> 1250.5).
- date: the transaction date as YYYY-MM-DD, or null if the email gives none.
- type: "expense" for money leaving the account, "income" for money coming in.
- counterparty: the merchant, payee or sender as a person would write it (e.g. "Careem", "Ali Raza"). Never include account numbers, masked digits (xxxx), CNIC numbers or channel words such as IBFT, RAAST, Easypaisa, ATM or POS.
- isTransaction: false for OTPs, login alerts, statements, promotions or anything that is not a completed transaction; then set the other fields to null.`;

const MAX_BODY_CHARS = 6000;

export interface AiParse {
	transaction: ParsedBankTransaction | null;
}

/** The AI result stored for an email. Undefined means the email was never sent to the model. */
export function cachedAiTransaction(
	raw: string | null,
): ParsedBankTransaction | null | undefined {
	if (!raw) return undefined;
	return (JSON.parse(raw) as AiParse).transaction;
}

export async function extractWithAi(
	email: BankEmail,
	model: LanguageModelV4,
): Promise<ParsedBankTransaction | null> {
	const { output } = await generateText({
		model,
		instructions: INSTRUCTIONS,
		prompt: [
			`From: ${email.from ?? ""}`,
			`Subject: ${email.subject ?? ""}`,
			"",
			email.body.slice(0, MAX_BODY_CHARS),
		].join("\n"),
		output: Output.object({ schema: extractionSchema }),
		reasoning: "low",
		maxRetries: 0,
		abortSignal: AbortSignal.timeout(20_000),
	});
	return toTransaction(output, email);
}

function toTransaction(
	extracted: z.infer<typeof extractionSchema>,
	email: BankEmail,
): ParsedBankTransaction | null {
	const { isTransaction, amount, type, counterparty } = extracted;
	if (!isTransaction || !type || amount === null || amount <= 0) return null;

	const date = isDateKey(extracted.date ?? "")
		? `${extracted.date}T12:00:00.000Z`
		: resolveDate(null, email.receivedAt);
	if (!date) return null;

	return {
		amount,
		date,
		type,
		description: counterparty?.trim() || "Bank Transaction",
	};
}
