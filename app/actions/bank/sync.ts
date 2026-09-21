"use server";

import { and, eq, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { applyBalanceDelta, signedAmount } from "@/lib/balance";
import { type BankEmail, parseBankEmail } from "@/lib/bank-email-parse";
import { db } from "@/lib/db";
import { accounts, gmail_messages, transactions } from "@/lib/db/schema";
import {
	deltaSync,
	type EmailBatch,
	fetchEmailsFromSender,
	fetchMessagesByIds,
	isGoogleAuthError,
	type ProcessedEmail,
	refreshAccessToken,
} from "@/lib/gmail";
import {
	type BankSenderConfig,
	getEnabledBankSenderConfigs,
	matchSenderConfig,
} from "@/lib/mail/bank-sender-config";
import { RefreshTokenRevokedError } from "@/lib/refresh";
import { getMailStatus, type MailStatus } from "@/lib/mail/credentials";
import {
	getAllEmails,
	getSavedHistoryId,
	getUnprocessedEmails,
	markEmailsProcessed,
	saveHistoryId,
	upsertEmails,
} from "@/lib/mail/gmail-store";

export type { MailStatus } from "@/lib/mail/credentials";

// ============================================================================
// APP-PASSWORD FLOW (kept for reference / fallback)
// ============================================================================
/*
import {
	clearMailCredentials,
	getDecryptedMailCredentials,
	saveMailCredentials,
} from "@/lib/mail/credentials";
import { fetchMeezanEmails } from "@/lib/mail/imap-client";

export async function saveMailCredentialsAction(
	email: string,
	password: string,
): Promise<MailStatus> {
	return saveMailCredentials(email, password);
}

export async function clearMailCredentialsAction() {
	clearMailCredentials();
	revalidatePath("/bank-transactions");
}

// Old sync body:
//   getDecryptedMailCredentials() -> email + appPassword
//   const emails = await fetchMeezanEmails(email, appPassword);
//   ... parse via parseBankTransaction, dedupe, insert ...
*/

// OAuth action shims (kept so existing UI imports resolve).
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

// Hashes the Gmail message id (rather than the parsed date/amount/description)
// so distinct transactions of the same amount on the same day - e.g. two
// separate PKR 20,000 ATM withdrawals in one sitting - aren't mistaken for
// duplicates and silently dropped. Each bank email is one real transaction.
async function hashKey(emailId: string) {
	const data = new TextEncoder().encode(emailId);
	const digest = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function ensureAccount(name: string): string {
	const existing = db
		.select({ id: accounts.id })
		.from(accounts)
		.where(eq(accounts.name, name))
		.get();
	if (existing) return existing.id;

	const id = crypto.randomUUID();
	db.insert(accounts).values({ id, name, balance: 0 }).run();
	return id;
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
	return savedHistoryId
		? deltaSync(accessToken, savedHistoryId, senderEmails)
		: fetchFromAllSenders(accessToken, senderEmails);
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
	repaired: number;
}

// Gives the parser the sender and a usable received date, so an alert whose
// body omits a date can still be dated from the message itself.
function toBankEmail(email: typeof gmail_messages.$inferSelect): BankEmail {
	const epoch = Number(email.internal_date);
	return {
		from: email.from,
		subject: email.subject,
		body: email.body_text ?? "",
		receivedAt:
			email.date ??
			(Number.isFinite(epoch) && epoch > 0
				? new Date(epoch).toISOString()
				: null),
	};
}

// Walks stored emails and materialises any bank transaction not yet recorded.
// Safe to run over already-processed emails: the per-message hash makes it
// idempotent, so it doubles as the reconciliation pass for the rescan path.
async function importTransactions(
	emails: (typeof gmail_messages.$inferSelect)[],
	configs: BankSenderConfig[],
	{ repairDescriptions = false }: { repairDescriptions?: boolean } = {},
): Promise<ImportResult> {
	const accountIds = new Map<string, string>();
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
	let repaired = 0;
	const processedIds: string[] = [];

	for (const email of emails) {
		const config = matchSenderConfig(email.from, configs);
		if (!config) continue;

		const tx = parseBankEmail(toBankEmail(email)).transaction;
		if (!tx) continue;
		fetched += 1;

		const isoDate = tx.date;
		const hash = await hashKey(email.id);
		if (known.has(hash)) {
			processedIds.push(email.id);
			// An improved parser can produce a better description for an email
			// already imported - update it in place rather than duplicating it.
			if (repairDescriptions && known.get(hash) !== tx.description) {
				db.update(transactions)
					.set({ notes: tx.description })
					.where(eq(transactions.external_hash, hash))
					.run();
				repaired += 1;
			}
			continue;
		}
		known.set(hash, tx.description);

		let accountId = accountIds.get(config.accountName);
		if (!accountId) {
			accountId = ensureAccount(config.accountName);
			accountIds.set(config.accountName, accountId);
		}

		const payment = tx.type === "expense" ? tx.amount : null;
		const deposit = tx.type === "income" ? tx.amount : null;

		db.transaction(() => {
			db.insert(transactions)
				.values({
					id: crypto.randomUUID(),
					account_id: accountId,
					payment,
					deposit,
					date: isoDate,
					notes: tx.description,
					source: "email",
					external_hash: hash,
				})
				.run();
			applyBalanceDelta(accountId, signedAmount(payment, deposit));
		});
		inserted += 1;
		processedIds.push(email.id);
	}

	markEmailsProcessed(processedIds);
	return { inserted, fetched, repaired };
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
		const { inserted, fetched } = await importTransactions(
			getUnprocessedEmails(),
			configs,
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
// Recovery: ignore the delta cursor and re-list every message per sender.
// Delta sync is cursor-based, so anything it skipped (an expired historyId,
// a fetch that failed mid-window, mail that arrived before a sender was
// configured) is invisible to it forever. This re-reads from the search index
// instead and reconciles - idempotent, thanks to per-message hashing.
// ============================================================================
export async function rescanBankTransactions(): Promise<
	| { success: true; inserted: number; scanned: number; repaired: number }
	| { success: false; error: string; needsReauth?: boolean }
> {
	try {
		const configs = getEnabledBankSenderConfigs();
		if (configs.length === 0) {
			throw new Error(
				"No bank sender configured yet. Add one below to start importing.",
			);
		}

		const senderEmails = configs.map((c) => c.senderEmail);
		let accessToken = await getAccessToken();

		let batch: EmailBatch;
		try {
			batch = await fetchFromAllSenders(accessToken, senderEmails);
		} catch (error) {
			if (!isGoogleAuthError(error)) throw error;
			accessToken = await forceRefreshAccessToken();
			batch = await fetchFromAllSenders(accessToken, senderEmails);
		}

		upsertEmails(batch.emails);
		if (batch.historyId && !batch.incomplete) saveHistoryId(batch.historyId);

		// Re-derive over every stored email, not just the unprocessed ones, so
		// anything previously mis-parsed or wrongly skipped is picked up too.
		const { inserted, fetched, repaired } = await importTransactions(
			getAllEmails(),
			configs,
			{ repairDescriptions: true },
		);

		revalidatePath("/bank-transactions");
		return { success: true, inserted, scanned: fetched, repaired };
	} catch (error) {
		console.error("Bank rescan error:", error);
		revalidatePath("/bank-transactions");
		return {
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to rescan bank emails",
			needsReauth: error instanceof RefreshTokenRevokedError,
		};
	}
}
