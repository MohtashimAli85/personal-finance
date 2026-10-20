import type { LanguageModelV4 } from "@ai-sdk/provider";
import { eq } from "drizzle-orm";
import { createFallbackModel } from "@/lib/ai/fallback";
import { availableModels } from "@/lib/ai/models";
import type { ParsedBankTransaction } from "@/lib/bank-email-parse";
import {
	hashEmailId,
	resolveAccountId,
	toBankEmail,
	transactionFields,
} from "@/lib/bank-import";
import { extractWithAi } from "@/lib/bank-parsers/ai";
import { db } from "@/lib/db";
import { type gmail_messages, transactions } from "@/lib/db/schema";
import {
	type BankSenderConfig,
	getEnabledBankSenderConfigs,
	matchSenderConfig,
} from "@/lib/mail/bank-sender-config";
import { getEmailsMissingAiParse, saveAiParse } from "@/lib/mail/gmail-store";

const BATCH_SIZE = 50;
const CONCURRENCY = 4;

type StoredEmail = typeof gmail_messages.$inferSelect;

/**
 * Asks the AI model to read bank emails the regex pass has not refined yet.
 * Each successful answer is cached on the email, so it is never asked twice.
 */
export async function refineBankTransactions(): Promise<{
	refined: number;
	skipped: boolean;
}> {
	const models = availableModels();
	if (models.length === 0) return { refined: 0, skipped: true };

	const model = createFallbackModel(models);
	const configs = getEnabledBankSenderConfigs();
	const queue = getEmailsMissingAiParse()
		.flatMap((email) => {
			const config = matchSenderConfig(email.from, configs);
			return config ? [{ email, config }] : [];
		})
		.slice(0, BATCH_SIZE);

	let refined = 0;
	for (let i = 0; i < queue.length; i += CONCURRENCY) {
		const results = await Promise.all(
			queue
				.slice(i, i + CONCURRENCY)
				.map(({ email, config }) => refineEmail(email, config, model)),
		);
		refined += results.filter(Boolean).length;
	}
	return { refined, skipped: false };
}

async function refineEmail(
	email: StoredEmail,
	config: BankSenderConfig,
	model: LanguageModelV4,
): Promise<boolean> {
	let transaction: ParsedBankTransaction | null;
	try {
		transaction = await extractWithAi(toBankEmail(email), model);
	} catch (error) {
		// Left uncached so the next sync retries it.
		console.error("[ai] bank email refinement failed:", error);
		return false;
	}

	const hash = await hashEmailId(email.id);
	db.transaction(() => {
		saveAiParse(email.id, transaction);
		if (transaction) applyAiResult(hash, transaction, config);
	});
	return true;
}

// The regex row is the baseline. AI overwrites a pending row entirely, but an
// accepted row only gets its name, since its amount and date are already in the
// budget. An email the regex missed becomes a new pending row.
function applyAiResult(
	hash: string,
	transaction: ParsedBankTransaction,
	config: BankSenderConfig,
) {
	const existing = db
		.select({ status: transactions.status })
		.from(transactions)
		.where(eq(transactions.external_hash, hash))
		.get();

	if (!existing) {
		db.insert(transactions)
			.values({
				id: crypto.randomUUID(),
				account_id: resolveAccountId(config),
				...transactionFields(transaction),
				source: "email",
				external_hash: hash,
				status: "pending",
			})
			.run();
	} else if (existing.status === "pending") {
		db.update(transactions)
			.set(transactionFields(transaction))
			.where(eq(transactions.external_hash, hash))
			.run();
	} else {
		db.update(transactions)
			.set({ notes: transaction.description })
			.where(eq(transactions.external_hash, hash))
			.run();
	}
}
