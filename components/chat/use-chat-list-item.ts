"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteChat, renameChat } from "@/app/actions/chat/mutations";
import { toastOnError } from "@/lib/action-result";
import type { ChatSummary } from "@/lib/chat";

export function useChatListItem(
	chat: ChatSummary,
	active: boolean,
	onChanged: () => void,
) {
	const router = useRouter();
	const [editing, setEditing] = useState(false);
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const [title, setTitle] = useState(chat.title ?? "");
	const [, startTransition] = useTransition();

	const saveTitle = () => {
		setEditing(false);
		if (!title.trim() || title === chat.title) return;
		startTransition(async () => {
			const result = await toastOnError(renameChat({ chatId: chat.id, title }));
			if (result.success) onChanged();
		});
	};

	const remove = () =>
		startTransition(async () => {
			const result = await toastOnError(deleteChat(chat.id));
			if (!result.success) return;
			onChanged();
			if (active) router.push("/chat");
		});

	return {
		editing,
		startEditing: () => setEditing(true),
		title,
		setTitle,
		saveTitle,
		confirmingDelete,
		setConfirmingDelete,
		remove,
	};
}
