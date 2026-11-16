"use client";

import { useMemo, useState } from "react";
import type { ChatSummary } from "@/lib/chat";
import { groupChatsByDate } from "@/lib/chat-groups";

export function useChatGroups(chats: ChatSummary[]) {
	const [query, setQuery] = useState("");

	const groups = useMemo(() => {
		const needle = query.trim().toLowerCase();
		const matches = needle
			? chats.filter((chat) => chat.title?.toLowerCase().includes(needle))
			: chats;
		return groupChatsByDate(matches);
	}, [chats, query]);

	return { query, setQuery, groups };
}
