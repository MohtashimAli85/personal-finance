import { type Auth, type gmail_v1, google } from "googleapis";

export interface ProcessedEmail {
	id: string;
	threadId: string;
	historyId?: string;
	from: string | null;
	subject: string | null;
	date: string | null;
	internalDate: string | null;
	snippet: string;
	bodyText: string;
}

export interface EmailBatch {
	emails: ProcessedEmail[];
	historyId: string;
	// True when some messages in this window could not be fetched. The caller
	// must not advance the stored historyId, so the window is retried.
	incomplete: boolean;
}

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function getOAuth2Client(): Auth.OAuth2Client {
	const clientId = process.env.GOOGLE_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
	const refreshToken =
		process.env.GMAIL_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN;

	if (!clientId || !clientSecret || !refreshToken) {
		throw new Error(
			"Gmail OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and a refresh token.",
		);
	}

	const client = new google.auth.OAuth2(
		clientId,
		clientSecret,
		`${appUrl()}/api/auth/callback/google`,
	);
	client.setCredentials({ refresh_token: refreshToken });
	return client;
}

function createGmail(auth: Auth.OAuth2Client | string): gmail_v1.Gmail {
	const client =
		typeof auth === "string"
			? new google.auth.OAuth2(
					process.env.GOOGLE_CLIENT_ID,
					process.env.GOOGLE_CLIENT_SECRET,
					`${appUrl()}/api/auth/callback/google`,
				)
			: auth;
	if (typeof auth === "string") {
		client.setCredentials({
			access_token: auth,
			refresh_token: process.env.GMAIL_REFRESH_TOKEN,
		});
	}
	return google.gmail({ version: "v1", auth: client });
}

export function getGmail(): gmail_v1.Gmail {
	return createGmail(getOAuth2Client());
}

export function getGmailFromAccessToken(accessToken: string): gmail_v1.Gmail {
	return createGmail(accessToken);
}

export async function getProfileEmail(
	accessToken: string,
): Promise<string | null> {
	try {
		const gmail = getGmailFromAccessToken(accessToken);
		const profile = await gmail.users.getProfile({
			userId: "me",
			fields: "emailAddress",
		});
		return profile.data.emailAddress ?? null;
	} catch {
		return null;
	}
}

function headerValue(
	headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
	name: string,
): string | null {
	const header = headers?.find(
		(h) => h.name?.toLowerCase() === name.toLowerCase(),
	);
	return header?.value ?? null;
}

export function decodeBase64Url(encoded: string): string {
	const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
	return Buffer.from(base64, "base64").toString("utf8");
}

function stripHtml(html: string): string {
	return html
		.replace(/<style[\s\S]*?<\/style>/gi, "")
		.replace(/<script[\s\S]*?<\/script>/gi, "")
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.replace(/\s{2,}/g, " ")
		.trim();
}

function collectPartText(part: gmail_v1.Schema$MessagePart | undefined): {
	plain: string[];
	html: string[];
} {
	const plain: string[] = [];
	const html: string[] = [];

	if (!part) return { plain, html };

	const mime = part.mimeType ?? "";
	const data = part.body?.data;
	if (data) {
		if (mime === "text/plain") plain.push(decodeBase64Url(data));
		else if (mime === "text/html") html.push(decodeBase64Url(data));
	}

	for (const child of part.parts ?? []) {
		const childText = collectPartText(child);
		plain.push(...childText.plain);
		html.push(...childText.html);
	}

	return { plain, html };
}

function extractBody(message: gmail_v1.Schema$Message): string {
	const { plain, html } = collectPartText(message.payload);

	if (plain.length) return plain.join("\n").trim();
	if (html.length) return stripHtml(html.join("\n"));

	const topData = message.payload?.body?.data;
	if (topData) {
		const decoded = decodeBase64Url(topData);
		return message.payload?.mimeType === "text/html"
			? stripHtml(decoded)
			: decoded.trim();
	}

	return "";
}

function toProcessedEmail(
	message: gmail_v1.Schema$Message,
	historyId?: string,
): ProcessedEmail {
	const headers = message.payload?.headers;
	return {
		id: message.id ?? "",
		threadId: message.threadId ?? "",
		historyId,
		from: headerValue(headers, "From"),
		subject: headerValue(headers, "Subject"),
		date: headerValue(headers, "Date"),
		internalDate: message.internalDate ?? null,
		snippet: message.snippet ?? "",
		bodyText: extractBody(message),
	};
}

const MESSAGE_FIELDS = "id,threadId,internalDate,snippet,payload";

// ============================================================================
// Phase 1: Smart initial fetch
//  - messages.list for IDs (cheap) + save historyId
//  - messages.get with field masks so only the needed fields are returned
// ============================================================================
export async function fetchEmailsFromSender(
	accessToken: string,
	senderEmail: string,
	{ maxMessages = 250 }: { maxMessages?: number } = {},
): Promise<EmailBatch> {
	const gmail = getGmailFromAccessToken(accessToken);

	// messages.list caps a page at 500 and returns a nextPageToken beyond that,
	// so it has to be walked - a single unpaginated call silently truncated the
	// history to the newest few dozen alerts.
	const ids: string[] = [];
	let pageToken: string | undefined;
	do {
		const list = await gmail.users.messages.list({
			userId: "me",
			q: `from:${senderEmail}`,
			maxResults: Math.min(100, maxMessages - ids.length),
			pageToken,
			fields: "messages(id),nextPageToken",
		});

		for (const message of list.data.messages ?? []) {
			if (message.id) ids.push(message.id);
		}
		pageToken = list.data.nextPageToken ?? undefined;
	} while (pageToken && ids.length < maxMessages);

	// The messages.list response has no historyId; get the mailbox's current
	// history id from the profile so it can be used for delta syncs later.
	const profile = await gmail.users.getProfile({
		userId: "me",
		fields: "historyId",
	});
	const historyId = profile.data.historyId ?? "";

	const { emails, failedIds } = await fetchMessagesByIds(
		accessToken,
		ids,
		historyId,
	);
	return { emails, historyId, incomplete: failedIds.length > 0 };
}

// ============================================================================
// Phase 2: Fetch latest changed messages (used after an initial historyId)
// ============================================================================
const FETCH_CONCURRENCY = 20;

// Returns the messages it could fetch plus the ids it could not. Callers must
// treat a non-empty `failedIds` as an incomplete window and refuse to advance
// the stored historyId - otherwise a single rate-limited messages.get drops a
// transaction permanently, because the cursor moves past it regardless.
export async function fetchMessagesByIds(
	accessToken: string,
	ids: string[],
	historyId?: string,
): Promise<{ emails: ProcessedEmail[]; failedIds: string[] }> {
	const gmail = getGmailFromAccessToken(accessToken);
	const emails: ProcessedEmail[] = [];
	const failedIds: string[] = [];

	// Gmail throttles per-user quota per second; fetching a few hundred ids
	// all at once reliably trips 429s, so the ids are walked in slices.
	for (let i = 0; i < ids.length; i += FETCH_CONCURRENCY) {
		const slice = ids.slice(i, i + FETCH_CONCURRENCY);
		const results = await Promise.allSettled(
			slice.map((id) =>
				gmail.users.messages.get({
					userId: "me",
					id,
					format: "full",
					fields: MESSAGE_FIELDS,
				}),
			),
		);

		for (const [index, result] of results.entries()) {
			if (result.status === "fulfilled" && result.value.data) {
				emails.push(toProcessedEmail(result.value.data, historyId));
				continue;
			}
			// An expired token must surface so the caller can refresh and retry,
			// rather than being quietly counted as an unfetchable message.
			if (result.status === "rejected" && isGoogleAuthError(result.reason)) {
				throw result.reason;
			}
			failedIds.push(slice[index]);
			if (result.status === "rejected") {
				console.error(
					"Gmail messages.get failed:",
					slice[index],
					result.reason,
				);
			}
		}
	}

	return { emails, failedIds };
}

// ============================================================================
// Phase 4: Delta sync — only fetch what changed since the last historyId
// ============================================================================
export async function deltaSync(
	accessToken: string,
	startHistoryId: string,
	allowedSenders: string[],
): Promise<EmailBatch> {
	const gmail = getGmailFromAccessToken(accessToken);

	// history.list returns records oldest-first and paginates once a mailbox
	// has enough activity since startHistoryId - the newest (and often most
	// relevant) messageAdded records land on the LAST page, so every page
	// must be walked or recent messages silently go missing. The response's
	// `historyId` is only guaranteed to reflect the mailbox's latest state
	// once there is no nextPageToken left, so that (not a page token) is
	// what gets persisted as the next startHistoryId.
	const ids = new Set<string>();
	let newHistoryId = startHistoryId;
	let pageToken: string | undefined;
	do {
		const history = await gmail.users.history.list({
			userId: "me",
			startHistoryId,
			historyTypes: ["messageAdded"],
			pageToken,
			fields: "historyId,nextPageToken,history(id,messagesAdded(message(id)))",
		});

		for (const h of (history.data.history ?? []).filter(
			(h) => h.messagesAdded,
		)) {
			for (const added of h.messagesAdded ?? []) {
				if (added.message?.id) ids.add(added.message.id);
			}
		}

		if (history.data.historyId) newHistoryId = history.data.historyId;
		pageToken = history.data.nextPageToken ?? undefined;
	} while (pageToken);

	const { emails, failedIds } = await fetchMessagesByIds(
		accessToken,
		[...ids],
		newHistoryId,
	);

	// history.list can't filter by sender, so it returns every new message in
	// the mailbox - only keep the ones from a configured bank sender rather
	// than storing every job alert / newsletter / promo that arrives.
	const senders = allowedSenders.map((s) => s.toLowerCase());
	const filtered = senders.length
		? emails.filter((email) =>
				senders.some((sender) => email.from?.toLowerCase().includes(sender)),
			)
		: emails;

	return {
		emails: filtered,
		historyId: newHistoryId,
		incomplete: failedIds.length > 0,
	};
}

export function isGoogleAuthError(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	const code = (error as { code?: unknown }).code;
	const status = (error as { status?: unknown }).status;
	return code === 401 || status === 401 || status === "UNAUTHENTICATED";
}

export { refreshAccessToken } from "./refresh";
export type { RefreshedToken } from "./refresh";

export type { Auth, gmail_v1 };
