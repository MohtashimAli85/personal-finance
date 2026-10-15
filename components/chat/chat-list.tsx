"use client";

import type { ChatSummary } from "@/lib/chat";
import ChatListItem from "./chat-list-item";
import { useChatGroups } from "./use-chat-groups";

export default function ChatList({
	chats,
	activePath,
	onChanged,
}: {
	chats: ChatSummary[];
	activePath: string;
	onChanged: () => void;
}) {
	const groups = useChatGroups(chats);

	if (chats.length === 0) {
		return (
			<p className="px-2 py-1.5 text-sm text-muted-foreground">No chats yet.</p>
		);
	}

	return groups.map((group) => (
		<section key={group.label} className="flex flex-col gap-0.5">
			<h2 className="px-2 pb-1 pt-3 text-xs font-medium text-muted-foreground">
				{group.label}
			</h2>
			{group.chats.map((chat) => (
				<ChatListItem
					key={`${chat.id}:${chat.title}`}
					chat={chat}
					active={activePath === `/chat/${chat.id}`}
					onChanged={onChanged}
				/>
			))}
		</section>
	));
}
