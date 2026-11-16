"use client";

import { MoreHorizontal } from "lucide-react";
import { DialogTrigger } from "../ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { SidebarMenuAction } from "../ui/sidebar";

export default function AccountActionsMenu({
	name,
	onRename,
}: {
	name: string;
	onRename: () => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<SidebarMenuAction showOnHover aria-label={`Actions for ${name}`}>
					<MoreHorizontal />
				</SidebarMenuAction>
			</DropdownMenuTrigger>
			<DropdownMenuContent side="right" align="start">
				<DropdownMenuItem onSelect={onRename}>Rename</DropdownMenuItem>
				<DialogTrigger asChild>
					<DropdownMenuItem>Close account</DropdownMenuItem>
				</DialogTrigger>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
