"use client";

import { useMemo } from "react";
import type { ChatSummary } from "@/lib/chat";
import { groupChatsByDate } from "@/lib/chat-groups";

export const useChatGroups = (chats: ChatSummary[]) =>
	useMemo(() => groupChatsByDate(chats), [chats]);
