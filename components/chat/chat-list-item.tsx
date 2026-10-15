"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import ConfirmDialog from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatSummary } from "@/lib/chat";
import { cn } from "@/lib/tailwindcss/utils";
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
				active &&
					"bg-accent font-medium text-accent-foreground hover:bg-accent",
			)}
		>
			<Link
				href={`/chat/${chat.id}`}
				className="min-w-0 flex-1 truncate px-2 py-1.5"
			>
				{chat.title === null ? (
					<Skeleton className="h-4 w-3/4" />
				) : (
					chat.title || "New chat"
				)}
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
					<DropdownMenuItem onSelect={startEditing}>Rename</DropdownMenuItem>
					<DropdownMenuItem
						variant="destructive"
						onSelect={() => setConfirmingDelete(true)}
					>
						Delete
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
		</div>
	);
}
