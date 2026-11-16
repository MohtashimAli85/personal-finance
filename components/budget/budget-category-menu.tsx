"use client";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BudgetCategoryMenuProps {
	name: string;
	onRename: () => void;
	onRecurring: () => void;
	onDelete: () => void;
}

const BudgetCategoryMenu = ({
	name,
	onRename,
	onRecurring,
	onDelete,
}: BudgetCategoryMenuProps) => {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="table"
					size="icon-xs"
					aria-label={`Actions for ${name}`}
					className="opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
				>
					<ChevronDown />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onSelect={onRename}>Rename</DropdownMenuItem>
				<DropdownMenuItem onSelect={onRecurring}>
					Recurring amount…
				</DropdownMenuItem>
				<DropdownMenuItem variant="destructive" onSelect={onDelete}>
					Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default BudgetCategoryMenu;
