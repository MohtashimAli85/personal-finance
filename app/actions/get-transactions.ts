"use server";

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export async function fetchMeezanTransactions() {
	console.log("fetchMeezanTransactions: start");
	const client = new ImapFlow({
		host: "imap.gmail.com",
		port: 993,
		secure: true,
		auth: {
			user: process.env.GMAIL_USER!,
			pass: process.env.GMAIL_APP_PASSWORD!, // 16-character App Password
		},
	});
	console.log("IMAP: connecting to imap.gmail.com:993");
	await client.connect();
	console.log("IMAP: connected");
	const lock = await client.getMailboxLock("INBOX");
	console.log("IMAP: mailbox locked - INBOX");

	try {
		// 1. Find emails from Meezan Bank
		const messages = await client.search({ from: "no-reply@meezanbank.com" });
		const transactions = [];
		if (!messages || messages.length === 0) {
			console.log("IMAP: no Meezan transactions found");
			return { success: true, data: [] }; // No transactions found
		}
		console.log(
			`IMAP: found ${messages?.length ?? 0} messages from no-reply@meezanbank.com`,
		);
		// 2. Loop through the last 10 emails
		for (const seq of messages.slice(-50).reverse()) {
			console.log(`IMAP: processing seq ${seq}`);
			const msg = await client.fetchOne(seq, { source: true });
			if (!msg || !msg.source) {
				console.log(`IMAP: seq ${seq} had no source, skipping`);
				continue;
			}
			const parsed = await simpleParser(msg.source);
			const text = parsed.text || "";
			console.log(
				`IMAP: seq ${seq} parsed subject: ${parsed.subject ?? "(no subject)"}`,
			);

			// 3. Regex Patterns
			// Finds numbers like 1,200.00 after Rs. or PKR
			const amountRegex = /(?:Rs\.|PKR)\s?([\d,]+\.\d{2})/i;
			// Finds dates like 18-Jan-2026
			const dateRegex = /\d{2}-[A-Za-z]{3}-\d{4}/;

			const amountMatch = text.match(amountRegex);
			const dateMatch = text.match(dateRegex);

			console.log(
				`IMAP: seq ${seq} amountMatch: ${amountMatch ? amountMatch[1] : "none"}, dateMatch: ${dateMatch ? dateMatch[0] : "none"}`,
			);

			if (amountMatch) {
				const isExpense =
					text.toLowerCase().includes("debited") ||
					text.toLowerCase().includes("sent");
				const type = isExpense ? "expense" : "income";
				const sendTo = text.toLowerCase().includes("sent to")
					? text.split("sent to")[1].split(" ")[1]
					: null;
				const transaction = {
					amount: amountMatch[1].replace(/,/g, ""), // Removes commas for math
					date: dateMatch ? dateMatch[0] : "Unknown Date",
					// debited or sent indicates expense
					type,
					description: extractMerchant(text),
					sendTo,
				};
				transactions.push(transaction);
				console.log("IMAP: transaction parsed", transaction);
			}
		}

		return { success: true, data: transactions, messages };
	} catch (error) {
		console.error("IMAP Error:", error);
		return { success: false, error: "Failed to fetch" };
	} finally {
		lock.release();
		await client.logout();
	}
}

// Normalize and clean a raw account/merchant string
function formatAccountTitle(raw: string) {
	if (!raw) return "";
	let s = raw.replace(/\r?\n/g, " ").trim();
	// Remove stray colons
	s = s.replace(/:+$/g, "").trim();
	// Remove common service / noise tokens and trailing IDs
	s = s.replace(
		/\b(EASYPAISA|TELENOR|BANK|BRANCH|ACC|ACCOUNT|IBFT|MOBILE|CNIC)\b/gi,
		"",
	);
	// If there are hyphen-delimited service tokens, take the first meaningful segment
	s = s.split(/-+/)[0].trim();
	// Collapse multiple spaces
	s = s.replace(/\s{2,}/g, " ");
	return s || "Meezan Transaction";
}

// Helper function to find WHO you paid or the beneficiary title
function extractMerchant(text: string) {
	// 1) Merchant Name lines
	const merchantLine = text.match(/Merchant\s+Name\s*[:-]\s*(.+)/i);
	if (merchantLine && merchantLine[1])
		return formatAccountTitle(merchantLine[1]);

	// 2) Beneficiary Account Title (some emails have extra colon like ": :")
	const beneficiaryTitle = text.match(
		/Beneficiary\s+Account\s+Title\s*[:]*\s*(.+)/i,
	);
	if (beneficiaryTitle && beneficiaryTitle[1])
		return formatAccountTitle(beneficiaryTitle[1]);

	// 3) Beneficiary Account (contains name and service tokens)
	const beneficiaryAccount = text.match(/Beneficiary\s+Account\s*[:-]\s*(.+)/i);
	if (beneficiaryAccount && beneficiaryAccount[1])
		return formatAccountTitle(beneficiaryAccount[1]);

	// 4) Fallback: "at <Merchant>" or "to <Account>"
	const fallback = text.match(
		/(?:at|to)\s+([A-Z0-9&.'\s]+?)(?=\s+on|\s+using|\.|$)/i,
	);
	if (fallback && fallback[1]) return formatAccountTitle(fallback[1]);

	return "Meezan Transaction";
}
