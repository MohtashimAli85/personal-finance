/*
 * APP-PASSWORD FLOW (kept for reference / fallback)
 * Reads bank alert emails over IMAP using the stored Gmail app password.
 * Superseded by Gmail API OAuth flow (see lib/gmail.ts).
 */
/*
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export interface RawBankEmail {
	text: string;
	subject: string | null;
}

export async function fetchMeezanEmails(
	email: string,
	appPassword: string,
): Promise<RawBankEmail[]> {
	const client = new ImapFlow({
		host: "imap.gmail.com",
		port: 993,
		secure: true,
		auth: { user: email, pass: appPassword },
	});

	await client.connect();
	const lock = await client.getMailboxLock("INBOX");

	try {
		const messages = await client.search({ from: "no-reply@meezanbank.com" });
		if (!messages || messages.length === 0) return [];

		const emails: RawBankEmail[] = [];
		for (const seq of messages.slice(-50).reverse()) {
			const msg = await client.fetchOne(seq, { source: true });
			if (!msg || !msg.source) continue;
			const parsed = await simpleParser(msg.source);
			emails.push({
				text: parsed.text || "",
				subject: parsed.subject ?? null,
			});
		}
		return emails;
	} finally {
		lock.release();
		await client.logout();
	}
}
*/
