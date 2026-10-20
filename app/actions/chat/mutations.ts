"use server";

import { z } from "zod";
import {
	CHAT_ID_RE,
	type ChatSummary,
	deleteChatRecord,
	listChats,
	setChatTitle,
} from "@/lib/chat";
import { serverAction } from "@/lib/server-action";

const chatId = z.string().regex(CHAT_ID_RE, "Invalid chat.");

export const renameChat = serverAction(
	z.object({
		chatId,
		title: z.string().trim().min(1, "Give the chat a name."),
	}),
	({ chatId, title }) => {
		setChatTitle(chatId, title);
	},
);

export const deleteChat = serverAction(chatId, (id) => {
	deleteChatRecord(id);
});

export async function listChatsAction(): Promise<ChatSummary[]> {
	return listChats();
}
