"use client";

import { Search } from "lucide-react";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
} from "@/components/ui/sidebar";
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
	const { query, setQuery, groups } = useChatGroups(chats);

	return (
		<>
			{chats.length > 0 && (
				<InputGroup className="h-8">
					<InputGroupAddon>
						<Search />
					</InputGroupAddon>
					<InputGroupInput
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search chats"
						aria-label="Search chats"
					/>
				</InputGroup>
			)}
			{groups.length === 0 && (
				<p className="px-2 py-1.5 text-sm text-muted-foreground">
					{chats.length === 0 ? "No chats yet." : "No chats match."}
				</p>
			)}
			{groups.map((group) => (
				<SidebarGroup key={group.label} className="p-0">
					<SidebarGroupLabel>{group.label}</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu className="gap-0.5">
							{group.chats.map((chat) => (
								<ChatListItem
									key={`${chat.id}:${chat.title}`}
									chat={chat}
									active={activePath === `/chat/${chat.id}`}
									onChanged={onChanged}
								/>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			))}
		</>
	);
}
