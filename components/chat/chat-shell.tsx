"use client";

import { History, MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useState } from "react";
import { listChatsAction } from "@/app/actions/chat/mutations";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import type { ChatSummary } from "@/lib/chat";
import ChatList from "./chat-list";
import { useChatHistorySheet } from "./use-chat-history-sheet";

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
	const history = useChatHistorySheet();

	const refreshChats = () => {
		listChatsAction().then(setChats);
	};

	const newChatButton = (
		<Button asChild variant="outline" className="justify-start">
			<Link href="/chat">
				<MessageSquarePlus /> New chat
			</Link>
		</Button>
	);
	const chatList = (
		<ChatList chats={chats} activePath={pathname} onChanged={refreshChats} />
	);

	return (
		<ChatShellContext.Provider value={{ refreshChats }}>
			<div className="flex min-h-0 flex-1 gap-4">
				<aside className="hidden w-56 shrink-0 flex-col gap-2 md:flex">
					{newChatButton}
					<nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
						{chatList}
					</nav>
				</aside>
				<div className="flex min-h-0 min-w-0 flex-1 flex-col">
					<div className="md:hidden">
						<Sheet open={history.open} onOpenChange={history.setOpen}>
							<SheetTrigger asChild>
								<Button variant="ghost" size="sm">
									<History /> History
								</Button>
							</SheetTrigger>
							<SheetContent side="left" className="w-72 gap-4 p-4">
								<SheetHeader className="p-0">
									<SheetTitle>Chats</SheetTitle>
								</SheetHeader>
								{newChatButton}
								<nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
									{chatList}
								</nav>
							</SheetContent>
						</Sheet>
					</div>
					{children}
				</div>
			</div>
		</ChatShellContext.Provider>
	);
}
