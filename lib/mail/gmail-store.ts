import { and, eq, isNull, like } from "drizzle-orm";
import type { ParsedBankTransaction } from "@/lib/bank-parsers/types";
import { db } from "@/lib/db";
import { gmail_messages, gmail_sync_state } from "@/lib/db/schema";
import type { ProcessedEmail } from "@/lib/gmail";

const SYNC_STATE_ID = "gmail";

export function getSavedHistoryId(): string | null {
	const row = db
		.select({ history_id: gmail_sync_state.history_id })
		.from(gmail_sync_state)
		.where(eq(gmail_sync_state.id, SYNC_STATE_ID))
		.get();
	return row?.history_id ?? null;
}

export function saveHistoryId(historyId: string): void {
	db.insert(gmail_sync_state)
		.values({ id: SYNC_STATE_ID, history_id: historyId })
		.onConflictDoUpdate({
			target: gmail_sync_state.id,
			set: { history_id: historyId, updated_at: new Date().toISOString() },
		})
		.run();
}

export function upsertEmails(emails: ProcessedEmail[]): void {
	if (emails.length === 0) return;

	for (const email of emails) {
		db.insert(gmail_messages)
			.values({
				id: email.id,
				thread_id: email.threadId,
				history_id: email.historyId,
				from: email.from,
				subject: email.subject,
				date: email.date,
				internal_date: email.internalDate,
				snippet: email.snippet,
				body_text: email.bodyText,
				received_at: new Date().toISOString(),
			})
			.onConflictDoUpdate({
				target: gmail_messages.id,
				set: {
					thread_id: email.threadId,
					history_id: email.historyId,
					from: email.from,
					subject: email.subject,
					date: email.date,
					internal_date: email.internalDate,
					snippet: email.snippet,
					body_text: email.bodyText,
				},
			})
			.run();
	}
}

// Every stored message, processed or not - the import re-derives transactions
// from scratch instead of trusting the processed flag.
export function getAllEmails(): (typeof gmail_messages.$inferSelect)[] {
	return db.select().from(gmail_messages).all();
}

export function markEmailsProcessed(ids: string[]): void {
	if (ids.length === 0) return;
	for (const id of ids) {
		db.update(gmail_messages)
			.set({ processed: true })
			.where(and(eq(gmail_messages.id, id)))
			.run();
	}
}

export function hasEmailFrom(sender: string): boolean {
	return Boolean(
		db
			.select({ id: gmail_messages.id })
			.from(gmail_messages)
			.where(like(gmail_messages.from, `%${sender}%`))
			.limit(1)
			.get(),
	);
}

// Every stored message the AI pass has not answered yet. A failed model call
// leaves the column null, so it is retried on the next sync.
export function getEmailsMissingAiParse(): (typeof gmail_messages.$inferSelect)[] {
	return db
		.select()
		.from(gmail_messages)
		.where(isNull(gmail_messages.ai_parse))
		.all();
}

export function saveAiParse(
	id: string,
	transaction: ParsedBankTransaction | null,
): void {
	db.update(gmail_messages)
		.set({ ai_parse: JSON.stringify({ transaction }) })
		.where(eq(gmail_messages.id, id))
		.run();
}
