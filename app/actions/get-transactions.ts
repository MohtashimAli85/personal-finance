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
    console.log(
      `IMAP: found ${messages?.length ?? 0} messages from no-reply@meezanbank.com`,
    );
    if (!messages || messages.length === 0) {
      console.log("IMAP: no Meezan transactions found");
      return { success: true, data: [] }; // No transactions found
    }
    // 2. Loop through the last 10 emails
    for (const seq of messages.slice(-20).reverse()) {
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

// Helper function to find WHO you paid
function extractMerchant(text: string) {
  // Meezan usually says "at [Merchant Name]" or "to [Account Name]"
  const merchantMatch = text.match(
    /(?:at|to)\s+([A-Z0-9\s\*]+?)(?=\s+on|\s+using|\.|$)/i,
  );
  return merchantMatch ? merchantMatch[1].trim() : "Meezan Transaction";
}
