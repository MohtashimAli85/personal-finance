"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import ConfirmDialog from "@/components/confirm-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatSummary } from "@/lib/chat";
import { useChatListItem } from "./use-chat-list-item";

export default function ChatListItem({
	chat,
	active,
	onChanged,
}: {
	chat: ChatSummary;
	active: boolean;
	onChanged: () => void;
}) {
	const {
		editing,
		startEditing,
		title,
		setTitle,
		saveTitle,
		confirmingDelete,
		setConfirmingDelete,
		remove,
	} = useChatListItem(chat, active, onChanged);

	if (editing) {
		return (
			<SidebarMenuItem>
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
						aria-label="Chat title"
						className="h-8 text-sm"
					/>
				</form>
			</SidebarMenuItem>
		);
	}

	return (
		<SidebarMenuItem>
			<SidebarMenuButton asChild isActive={active}>
				<Link href={`/chat/${chat.id}`}>
					{chat.title === null ? (
						<Skeleton className="h-4 w-3/4" />
					) : (
						<span>{chat.title || "New chat"}</span>
					)}
				</Link>
			</SidebarMenuButton>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<SidebarMenuAction showOnHover aria-label="Chat actions">
						<MoreHorizontal />
					</SidebarMenuAction>
				</DropdownMenuTrigger>
				<DropdownMenuContent side="right" align="start">
					<DropdownMenuItem onSelect={startEditing}>
						<Pencil /> Rename
					</DropdownMenuItem>
					<DropdownMenuItem
						variant="destructive"
						onSelect={() => setConfirmingDelete(true)}
					>
						<Trash2 /> Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<ConfirmDialog
				open={confirmingDelete}
				onOpenChange={setConfirmingDelete}
				title={`Delete "${chat.title || "New chat"}"?`}
				description="This chat and all its messages will be deleted."
				onConfirm={remove}
			/>
		</SidebarMenuItem>
	);
}
