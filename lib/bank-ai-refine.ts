import { eq } from "drizzle-orm";
import { createFallbackModel } from "@/lib/ai/fallback";
import { availableModels } from "@/lib/ai/models";
import type { BankEmail, ParsedBankTransaction } from "@/lib/bank-email-parse";
import {
	hashEmailId,
	resolveAccountId,
	toBankEmail,
	transactionFields,
} from "@/lib/bank-import";
import { extractWithAi } from "@/lib/bank-parsers/ai";
import { isRejectedImport } from "@/lib/bank-review";
import { db } from "@/lib/db";
import { type gmail_messages, transactions } from "@/lib/db/schema";
import { extractWithLocalModel } from "@/lib/local-ai/extract";
import { installedLocalModel, localModelPath } from "@/lib/local-ai/model-file";
import {
	type BankSenderConfig,
	getEnabledBankSenderConfigs,
	matchSenderConfig,
} from "@/lib/mail/bank-sender-config";
import { getEmailsMissingAiParse, saveAiParse } from "@/lib/mail/gmail-store";

const BATCH_SIZE = 50;

type StoredEmail = typeof gmail_messages.$inferSelect;

interface Extractor {
	extract: (email: BankEmail) => Promise<ParsedBankTransaction | null>;
	concurrency: number;
}

// A cloud key gives the best answers; without one, the on-device model reads
// the mail on this computer, one email at a time.
function chooseExtractor(): Extractor | null {
	const models = availableModels();
	if (models.length > 0) {
		const model = createFallbackModel(models);
		return { extract: (email) => extractWithAi(email, model), concurrency: 4 };
	}
	const local = installedLocalModel();
	if (local) {
		return {
			extract: (email) => extractWithLocalModel(email, localModelPath(local)),
			concurrency: 1,
		};
	}
	return null;
}

/**
 * Asks an AI model to read bank emails the regex pass has not refined yet.
 * Each successful answer is cached on the email, so it is never asked twice.
 */
export async function refineBankTransactions(): Promise<{
	refined: number;
	skipped: boolean;
}> {
	const extractor = chooseExtractor();
	if (!extractor) return { refined: 0, skipped: true };

	const configs = getEnabledBankSenderConfigs();
	const queue = getEmailsMissingAiParse()
		.flatMap((email) => {
			const config = matchSenderConfig(email.from, configs);
			return config ? [{ email, config }] : [];
		})
		.slice(0, BATCH_SIZE);

	let refined = 0;
	for (let i = 0; i < queue.length; i += extractor.concurrency) {
		const results = await Promise.all(
			queue
				.slice(i, i + extractor.concurrency)
				.map(({ email, config }) => refineEmail(email, config, extractor)),
		);
		refined += results.filter(Boolean).length;
	}
	return { refined, skipped: false };
}

async function refineEmail(
	email: StoredEmail,
	config: BankSenderConfig,
	extractor: Extractor,
): Promise<boolean> {
	let transaction: ParsedBankTransaction | null;
	try {
		transaction = await extractor.extract(toBankEmail(email));
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
		if (isRejectedImport(hash)) return;
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
