"use server";

import { revalidatePath } from "next/cache";
import { CHAT_ID_RE, deleteChatRecord, setChatTitle } from "@/lib/chat";

export async function renameChat(
	chatId: string,
	title: string,
): Promise<ActionState> {
	if (!CHAT_ID_RE.test(chatId) || !title.trim()) {
		return { success: false, message: "Give the chat a name." };
	}
	setChatTitle(chatId, title);
	revalidatePath("/chat", "layout");
	return { success: true };
}

export async function deleteChat(chatId: string): Promise<ActionState> {
	if (!CHAT_ID_RE.test(chatId)) {
		return { success: false, message: "Invalid chat." };
	}
	deleteChatRecord(chatId);
	revalidatePath("/chat", "layout");
	return { success: true };
}
