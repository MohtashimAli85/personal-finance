import "server-only";
import { type FetchMessageObject, ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { MailCredentials } from "./credentials";

export interface ProcessedEmail {
	id: string;
	threadId: string;
	from: string | null;
	subject: string | null;
	date: string | null;
	internalDate: string | null;
	snippet: string;
	bodyText: string;
}

export class MailAuthError extends Error {
	constructor() {
		super(
			"Gmail rejected the email or app password. Check them, or create a new app password.",
		);
		this.name = "MailAuthError";
	}
}

const MAX_PER_SENDER = 250;

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

// Gmail's X-GM-MSGID arrives in decimal; the Gmail API used the same number in
// hex, and imported transactions are de-duplicated by that hex id.
const toGmailId = (id: string | undefined) =>
	id && /^\d+$/.test(id) ? BigInt(id).toString(16) : (id ?? "");

async function withMailbox<T>(
	credentials: MailCredentials,
	run: (client: ImapFlow) => Promise<T>,
): Promise<T> {
	const client = new ImapFlow({
		host: "imap.gmail.com",
		port: 993,
		secure: true,
		auth: { user: credentials.email, pass: credentials.appPassword },
		logger: false,
	});
	try {
		await client.connect();
	} catch (error) {
		if ((error as { authenticationFailed?: boolean }).authenticationFailed) {
			throw new MailAuthError();
		}
		throw error;
	}
	try {
		const mailboxes = await client.list();
		const allMail =
			mailboxes.find((mailbox) => mailbox.specialUse === "\\All")?.path ??
			"INBOX";
		const lock = await client.getMailboxLock(allMail);
		try {
			return await run(client);
		} finally {
			lock.release();
		}
	} finally {
		await client.logout().catch(() => {});
	}
}

export const verifyCredentials = (credentials: MailCredentials) =>
	withMailbox(credentials, async () => {});

async function toProcessedEmail(
	message: FetchMessageObject,
): Promise<ProcessedEmail> {
	const parsed = await simpleParser(message.source ?? Buffer.alloc(0));
	const bodyText =
		parsed.text?.trim() || (parsed.html ? stripHtml(parsed.html) : "");
	const dateLine = parsed.headerLines.find((h) => h.key === "date")?.line;
	return {
		id: toGmailId(message.emailId),
		threadId: toGmailId(message.threadId),
		from: parsed.from?.text ?? null,
		subject: parsed.subject ?? null,
		date: dateLine?.replace(/^date:\s*/i, "") ?? null,
		internalDate: message.internalDate
			? String(new Date(message.internalDate).getTime())
			: null,
		snippet: bodyText.slice(0, 200),
		bodyText,
	};
}

// Reads the newest alerts from each sender, downloading only the messages
// whose id is not in `knownIds`.
export function fetchNewEmails(
	credentials: MailCredentials,
	senders: string[],
	knownIds: Set<string>,
): Promise<ProcessedEmail[]> {
	return withMailbox(credentials, async (client) => {
		const uids = new Set<number>();
		for (const sender of senders) {
			const found = await client.search({ from: sender }, { uid: true });
			for (const uid of (found || []).slice(-MAX_PER_SENDER)) uids.add(uid);
		}
		if (uids.size === 0) return [];

		const ids = await client.fetchAll([...uids], { uid: true }, { uid: true });
		const fresh = ids
			.filter((message) => !knownIds.has(toGmailId(message.emailId)))
			.map((message) => message.uid);
		if (fresh.length === 0) return [];

		const messages = await client.fetchAll(
			fresh,
			{ uid: true, source: true, internalDate: true, threadId: true },
			{ uid: true },
		);
		return Promise.all(messages.map(toProcessedEmail));
	});
}
