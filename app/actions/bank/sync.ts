"use server";

import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { applyBalanceDelta, balanceEffect, signedAmount } from "@/lib/balance";
import { parseBankEmail } from "@/lib/bank-email-parse";
import {
	hashEmailId,
	resolveAccountId,
	toBankEmail,
	transactionFields,
} from "@/lib/bank-import";
import { cachedAiTransaction } from "@/lib/bank-parsers/ai";
import { db } from "@/lib/db";
import { gmail_messages, transactions } from "@/lib/db/schema";
import {
	deltaSync,
	type EmailBatch,
	fetchEmailsFromSender,
	fetchMessagesByIds,
	isGoogleAuthError,
	isHistoryExpiredError,
	type ProcessedEmail,
	refreshAccessToken,
} from "@/lib/gmail";
import {
	type BankSenderConfig,
	getEnabledBankSenderConfigs,
	matchSenderConfig,
} from "@/lib/mail/bank-sender-config";
import { getMailStatus, type MailStatus } from "@/lib/mail/credentials";
import {
	getAllEmails,
	getSavedHistoryId,
	hasEmailFrom,
	markEmailsProcessed,
	saveHistoryId,
	upsertEmails,
} from "@/lib/mail/gmail-store";
import { RefreshTokenRevokedError } from "@/lib/refresh";

export type { MailStatus } from "@/lib/mail/credentials";

// The bank-transactions UI still imports these two action names for its
// (now unused) app-password form fields; kept as no-op shims rather than
// touching every call site. Gmail OAuth (below) is the only live import path.
export async function saveMailCredentialsAction(
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_email: string,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_password: string,
): Promise<MailStatus> {
	return getMailStatus();
}

export async function clearMailCredentialsAction() {
	revalidatePath("/bank-transactions");
}

const TOKEN_EXPIRY_BUFFER_MS = 60_000;

function isTokenExpired(expiryCookie: string | undefined): boolean {
	if (!expiryCookie) return false;
	const expiresAt = Number(expiryCookie);
	if (!Number.isFinite(expiresAt)) return false;
	return Date.now() >= expiresAt - TOKEN_EXPIRY_BUFFER_MS;
}

async function persistAccessToken(
	accessToken: string,
	expiresIn: number,
): Promise<void> {
	const store = await cookies();
	const secure = (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https");
	store.set("google_access_token", accessToken, {
		httpOnly: true,
		secure,
		sameSite: "lax",
		path: "/",
	});
	store.set("google_token_expiry", String(Date.now() + expiresIn * 1000), {
		httpOnly: true,
		secure,
		sameSite: "lax",
		path: "/",
	});
}

async function clearAuthCookies(): Promise<void> {
	const store = await cookies();
	store.delete("google_access_token");
	store.delete("google_refresh_token");
	store.delete("google_token_expiry");
	store.delete("google_email");
}

async function refreshAndPersist(refreshToken: string): Promise<string> {
	try {
		const { accessToken, expiresIn } = await refreshAccessToken(refreshToken);
		await persistAccessToken(accessToken, expiresIn);
		return accessToken;
	} catch (error) {
		// A revoked/expired refresh token can never recover on its own - drop the
		// dead session so the UI falls back to the "connect Gmail" flow instead
		// of showing a connected account whose every sync fails.
		if (error instanceof RefreshTokenRevokedError) await clearAuthCookies();
		throw error;
	}
}

// Returns a valid Gmail access token (from OAuth cookie, else env),
// proactively refreshing it if it is expired or about to expire.
async function getAccessToken(): Promise<string> {
	const store = await cookies();
	const token = store.get("google_access_token")?.value;
	const expiry = store.get("google_token_expiry")?.value;
	const refreshToken = store.get("google_refresh_token")?.value;

	if (token && !isTokenExpired(expiry)) return token;
	if (refreshToken) return refreshAndPersist(refreshToken);
	if (token) return token;

	const envToken = process.env.GMAIL_ACCESS_TOKEN;
	if (envToken) return envToken;

	const envRefresh = process.env.GMAIL_REFRESH_TOKEN;
	if (envRefresh) return refreshAndPersist(envRefresh);

	throw new Error(
		"Gmail OAuth is not configured. Sign in via /api/auth/google/login.",
	);
}

// Fallback for when the proactive expiry check misses (clock drift, a token
// revoked early, or an unknown expiry) and Gmail rejects the token outright.
async function forceRefreshAccessToken(): Promise<string> {
	const store = await cookies();
	const refreshToken =
		store.get("google_refresh_token")?.value || process.env.GMAIL_REFRESH_TOKEN;
	if (!refreshToken) {
		throw new Error(
			"Gmail access token expired and no refresh token is available. Sign in again via /api/auth/google/login.",
		);
	}
	return refreshAndPersist(refreshToken);
}

// ============================================================================
// Phase 1 + 4: decide initial fetch vs delta sync, then persist emails locally
// ============================================================================
async function fetchFromAllSenders(
	accessToken: string,
	senderEmails: string[],
): Promise<EmailBatch> {
	const emails: ProcessedEmail[] = [];
	let historyId = "";
	let incomplete = false;
	for (const senderEmail of senderEmails) {
		const result = await fetchEmailsFromSender(accessToken, senderEmail);
		emails.push(...result.emails);
		if (result.historyId) historyId = result.historyId;
		if (result.incomplete) incomplete = true;
	}
	return { emails, historyId, incomplete };
}

async function fetchBatch(
	accessToken: string,
	savedHistoryId: string | null,
	senderEmails: string[],
): Promise<EmailBatch> {
	// The cursor only covers mail that arrived after it was saved, so a sender
	// added since then needs a full read to pick up its older mail.
	const hasUnseenSender = senderEmails.some((sender) => !hasEmailFrom(sender));
	if (!savedHistoryId || hasUnseenSender) {
		return fetchFromAllSenders(accessToken, senderEmails);
	}
	try {
		return await deltaSync(accessToken, savedHistoryId, senderEmails);
	} catch (error) {
		if (!isHistoryExpiredError(error)) throw error;
		return fetchFromAllSenders(accessToken, senderEmails);
	}
}

async function syncEmailsToDb(configs: BankSenderConfig[]): Promise<number> {
	const senderEmails = configs.map((c) => c.senderEmail);
	let accessToken = await getAccessToken();
	const savedHistoryId = getSavedHistoryId();

	let batch: EmailBatch;
	try {
		batch = await fetchBatch(accessToken, savedHistoryId, senderEmails);
	} catch (error) {
		if (!isGoogleAuthError(error)) throw error;
		accessToken = await forceRefreshAccessToken();
		batch = await fetchBatch(accessToken, savedHistoryId, senderEmails);
	}

	upsertEmails(batch.emails);
	// Only move the cursor when the whole window was read. Advancing past
	// messages that failed to fetch would drop them permanently, since delta
	// sync never looks behind the stored historyId again.
	if (batch.historyId && !batch.incomplete) saveHistoryId(batch.historyId);

	// Self-heal: any stored email that still has no body text (e.g. fetched
	// before body extraction was wired up) gets re-fetched with full format.
	const missingBodies = db
		.select({ id: gmail_messages.id })
		.from(gmail_messages)
		.where(
			and(
				eq(gmail_messages.processed, false),
				or(isNull(gmail_messages.body_text), eq(gmail_messages.body_text, "")),
			),
		)
		.all()
		.map((row) => row.id);

	if (missingBodies.length > 0) {
		let refetched: Awaited<ReturnType<typeof fetchMessagesByIds>>;
		try {
			refetched = await fetchMessagesByIds(accessToken, missingBodies);
		} catch (error) {
			if (!isGoogleAuthError(error)) throw error;
			accessToken = await forceRefreshAccessToken();
			refetched = await fetchMessagesByIds(accessToken, missingBodies);
		}
		const recovered = refetched.emails.filter(
			(email) => email.bodyText.length > 0,
		);
		upsertEmails(recovered);
		batch.emails.push(...recovered);
	}

	return batch.emails.length;
}

// ============================================================================
// Phase 3: read emails locally, convert to bank transactions
// ============================================================================
interface ImportResult {
	inserted: number;
	fetched: number;
}

// Walks stored emails and materialises any bank transaction not yet recorded.
// Safe to run over already-processed emails: the per-message hash makes it
// idempotent. A cached AI reading wins over the regex one, so a re-import never
// reverts a refined name.
async function importTransactions(
	emails: (typeof gmail_messages.$inferSelect)[],
	configs: BankSenderConfig[],
	{ repairDescriptions = false }: { repairDescriptions?: boolean } = {},
): Promise<ImportResult> {
	const known = new Map(
		db
			.select({ hash: transactions.external_hash, notes: transactions.notes })
			.from(transactions)
			.where(eq(transactions.source, "email"))
			.all()
			.filter((row): row is { hash: string; notes: string | null } =>
				Boolean(row.hash),
			)
			.map((row) => [row.hash, row.notes] as const),
	);

	let inserted = 0;
	let fetched = 0;
	const processedIds: string[] = [];

	for (const email of emails) {
		const config = matchSenderConfig(email.from, configs);
		if (!config) continue;

		const tx =
			cachedAiTransaction(email.ai_parse) ??
			parseBankEmail(toBankEmail(email)).transaction;
		if (!tx) continue;
		fetched += 1;

		const hash = await hashEmailId(email.id);
		if (known.has(hash)) {
			processedIds.push(email.id);
			// An improved parser or AI pass can produce a better description for an
			// email already imported - update it in place rather than duplicating it.
			if (repairDescriptions && known.get(hash) !== tx.description) {
				db.update(transactions)
					.set({ notes: tx.description })
					.where(eq(transactions.external_hash, hash))
					.run();
			}
			continue;
		}
		known.set(hash, tx.description);

		db.insert(transactions)
			.values({
				id: crypto.randomUUID(),
				account_id: resolveAccountId(config),
				...transactionFields(tx),
				source: "email",
				external_hash: hash,
				// Lands in the bank-transactions review queue; it affects neither
				// the budget nor the account balance until accepted.
				status: "pending",
			})
			.run();
		inserted += 1;
		processedIds.push(email.id);
	}

	markEmailsProcessed(processedIds);
	return { inserted, fetched };
}

export async function syncBankTransactions(): Promise<
	| { success: true; inserted: number; fetched: number }
	| { success: false; error: string; needsReauth?: boolean }
> {
	try {
		const configs = getEnabledBankSenderConfigs();
		if (configs.length === 0) {
			throw new Error(
				"No bank sender configured yet. Add one below to start importing.",
			);
		}

		await syncEmailsToDb(configs);
		// Re-derives over every stored email, not just the unprocessed ones, so a
		// mis-parsed description from an earlier run is repaired too.
		const { inserted, fetched } = await importTransactions(
			getAllEmails(),
			configs,
			{ repairDescriptions: true },
		);

		revalidatePath("/bank-transactions");
		return { success: true, inserted, fetched };
	} catch (error) {
		console.error("Bank sync error:", error);
		revalidatePath("/bank-transactions");
		return {
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to fetch bank emails",
			needsReauth: error instanceof RefreshTokenRevokedError,
		};
	}
}

// ============================================================================
// Review queue: pending imports don't reach the budget until accepted.
// ============================================================================

/** Accepts a pending imported transaction into the ledger, optionally
 * assigning a category so it counts toward budget activity immediately. */
export async function acceptBankTransaction(
	id: string,
	categoryId?: string | null,
) {
	const tx = db
		.select({
			payment: transactions.payment,
			deposit: transactions.deposit,
			account_id: transactions.account_id,
			status: transactions.status,
		})
		.from(transactions)
		.where(eq(transactions.id, id))
		.get();
	if (!tx) return;
	db.transaction(() => {
		db.update(transactions)
			.set({
				status: "cleared",
				...(categoryId !== undefined
					? { category_id: categoryId || null }
					: {}),
			})
			.where(eq(transactions.id, id))
			.run();
		if (tx.status === "pending") {
			applyBalanceDelta(tx.account_id, signedAmount(tx.payment, tx.deposit));
		}
	});
	revalidatePath("/bank-transactions");
	revalidatePath("/budget");
	revalidatePath("/transactions");
	revalidatePath("/");
}

export async function bulkAcceptBankTransactions(
	ids: string[],
	categoryId?: string | null,
) {
	if (!ids.length) return;
	const rows = db
		.select({
			id: transactions.id,
			payment: transactions.payment,
			deposit: transactions.deposit,
			account_id: transactions.account_id,
			status: transactions.status,
		})
		.from(transactions)
		.where(inArray(transactions.id, ids))
		.all();
	db.transaction(() => {
		for (const tx of rows) {
			db.update(transactions)
				.set({
					status: "cleared",
					...(categoryId ? { category_id: categoryId } : {}),
				})
				.where(eq(transactions.id, tx.id))
				.run();
			if (tx.status === "pending") {
				applyBalanceDelta(tx.account_id, signedAmount(tx.payment, tx.deposit));
			}
		}
	});
	revalidatePath("/bank-transactions");
	revalidatePath("/budget");
	revalidatePath("/transactions");
	revalidatePath("/");
}

/** Rejects a pending imported transaction: removes it from the ledger. */
export async function rejectBankTransaction(id: string) {
	const tx = db
		.select({
			payment: transactions.payment,
			deposit: transactions.deposit,
			account_id: transactions.account_id,
			status: transactions.status,
		})
		.from(transactions)
		.where(eq(transactions.id, id))
		.get();
	if (!tx) return;
	db.transaction(() => {
		applyBalanceDelta(tx.account_id, -balanceEffect(tx));
		db.delete(transactions).where(eq(transactions.id, id)).run();
	});
	revalidatePath("/bank-transactions");
	revalidatePath("/");
}
