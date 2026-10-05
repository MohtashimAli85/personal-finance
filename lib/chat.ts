import { asc, desc, eq, sql } from "drizzle-orm";
import type { CoachUIMessage } from "@/lib/ai/message-types";
import { db } from "@/lib/db";
import { chat_messages, chats } from "@/lib/db/schema";

export interface ChatSummary {
	id: string;
	title: string | null;
	updatedAt: string | null;
}

export const CHAT_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export function listChats(): ChatSummary[] {
	return db
		.select({ id: chats.id, title: chats.title, updatedAt: chats.updated_at })
		.from(chats)
		.orderBy(desc(chats.updated_at), desc(chats.created_at))
		.all();
}

export function getChat(id: string): ChatSummary | null {
	if (!CHAT_ID_RE.test(id)) return null;
	return (
		db
			.select({ id: chats.id, title: chats.title, updatedAt: chats.updated_at })
			.from(chats)
			.where(eq(chats.id, id))
			.get() ?? null
	);
}

export function ensureChat(id: string): void {
	if (!CHAT_ID_RE.test(id)) throw new Error("Invalid chat id");
	db.insert(chats).values({ id }).onConflictDoNothing().run();
}

export function loadChatMessages(chatId: string): CoachUIMessage[] {
	return db
		.select()
		.from(chat_messages)
		.where(eq(chat_messages.chat_id, chatId))
		.orderBy(asc(chat_messages.position))
		.all()
		.map((row) => ({
			id: row.id,
			role: row.role as CoachUIMessage["role"],
			parts: JSON.parse(row.parts),
			...(row.metadata ? { metadata: JSON.parse(row.metadata) } : {}),
		}));
}

/** Replaces the stored conversation with `messages` - the client and stream
 * both work with the whole list, and approvals edit earlier messages. */
export function saveChatMessages(chatId: string, messages: CoachUIMessage[]) {
	db.transaction(() => {
		ensureChat(chatId);
		db.delete(chat_messages).where(eq(chat_messages.chat_id, chatId)).run();
		messages.forEach((message, position) => {
			db.insert(chat_messages)
				.values({
					id: message.id,
					chat_id: chatId,
					position,
					role: message.role,
					parts: JSON.stringify(message.parts),
					metadata: message.metadata ? JSON.stringify(message.metadata) : null,
				})
				.run();
		});
		db.update(chats)
			.set({ updated_at: sql`(datetime('now'))` })
			.where(eq(chats.id, chatId))
			.run();
	});
}

export function setChatTitle(chatId: string, title: string) {
	db.update(chats)
		.set({ title: title.trim().slice(0, 80) || null })
		.where(eq(chats.id, chatId))
		.run();
}

export function deleteChatRecord(chatId: string) {
	db.delete(chats).where(eq(chats.id, chatId)).run();
}
