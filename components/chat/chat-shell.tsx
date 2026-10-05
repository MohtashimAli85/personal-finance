"use client";

import { MessageSquarePlus, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useState, useTransition } from "react";
import {
	deleteChat,
	listChatsAction,
	renameChat,
} from "@/app/actions/chat/mutations";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { ChatSummary } from "@/lib/chat";
import { cn } from "@/lib/tailwindcss/utils";

const ChatShellContext = createContext<{ refreshChats: () => void }>({
	refreshChats: () => {},
});

export const useChatShell = () => useContext(ChatShellContext);

function ChatListItem({
	chat,
	active,
	onChanged,
}: {
	chat: ChatSummary;
	active: boolean;
	onChanged: () => void;
}) {
	const router = useRouter();
	const [editing, setEditing] = useState(false);
	const [title, setTitle] = useState(chat.title ?? "");
	const [, startTransition] = useTransition();

	const saveTitle = () => {
		setEditing(false);
		if (!title.trim() || title === chat.title) return;
		startTransition(async () => {
			await renameChat(chat.id, title);
			onChanged();
		});
	};

	if (editing) {
		return (
			<form
				onSubmit={(event) => {
					event.preventDefault();
					saveTitle();
				}}
			>
				<Input
					autoFocus
					value={title}
					onChange={(event) => setTitle(event.target.value)}
					onBlur={saveTitle}
					className="h-8 text-sm"
				/>
			</form>
		);
	}

	return (
		<div
			className={cn(
				"group flex items-center rounded-md text-sm hover:bg-muted",
				active && "bg-muted font-medium",
			)}
		>
			<Link
				href={`/chat/${chat.id}`}
				className="min-w-0 flex-1 truncate px-2 py-1.5"
			>
				{chat.title || "New chat"}
			</Link>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon-xs"
						className="mr-1 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
						aria-label="Chat actions"
					>
						<MoreHorizontal />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onSelect={() => setEditing(true)}>
						Rename
					</DropdownMenuItem>
					<DropdownMenuItem
						variant="destructive"
						onSelect={() =>
							startTransition(async () => {
								await deleteChat(chat.id);
								onChanged();
								if (active) router.push("/chat");
							})
						}
					>
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

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
