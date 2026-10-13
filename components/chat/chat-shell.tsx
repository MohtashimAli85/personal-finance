"use client";

import { MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useState } from "react";
import { listChatsAction } from "@/app/actions/chat/mutations";
import { Button } from "@/components/ui/button";
import type { ChatSummary } from "@/lib/chat";
import ChatListItem from "./chat-list-item";

const ChatShellContext = createContext<{ refreshChats: () => void }>({
	refreshChats: () => {},
});

export const useChatShell = () => useContext(ChatShellContext);

export default function ChatShell({
	initialChats,
	children,
}: {
	initialChats: ChatSummary[];
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const [chats, setChats] = useState(initialChats);

	const refreshChats = () => {
		listChatsAction().then(setChats);
	};

	return (
		<ChatShellContext.Provider value={{ refreshChats }}>
			<div className="flex min-h-0 flex-1 gap-4">
				<aside className="hidden w-56 shrink-0 flex-col gap-2 md:flex">
					<Button asChild variant="outline" className="justify-start">
						<Link href="/chat">
							<MessageSquarePlus /> New chat
						</Link>
					</Button>
					<nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
						{chats.length === 0 && (
							<p className="px-2 py-1.5 text-sm text-muted-foreground">
								No chats yet.
							</p>
						)}
						{chats.map((chat) => (
							<ChatListItem
								key={`${chat.id}:${chat.title}`}
								chat={chat}
								active={pathname === `/chat/${chat.id}`}
								onChanged={refreshChats}
							/>
						))}
					</nav>
				</aside>
				<div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
			</div>
		</ChatShellContext.Provider>
	);
}
