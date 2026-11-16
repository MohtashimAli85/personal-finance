"use client";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface BudgetGroupMenuProps {
	name: string;
	onAddCategory?: () => void;
	onRename?: () => void;
	onDelete?: () => void;
}

const BudgetGroupMenu = ({
	name,
	onAddCategory,
	onRename,
	onDelete,
}: BudgetGroupMenuProps) => {
	return (
		<>
			{onAddCategory && (
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							type="button"
							variant="table"
							size="icon-xs"
							onClick={onAddCategory}
							aria-label={`Add category to ${name}`}
						>
							<Plus />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Add category</TooltipContent>
				</Tooltip>
			)}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						variant="table"
						size="icon-xs"
						aria-label={`Actions for ${name}`}
					>
						<ChevronDown />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{onAddCategory && (
						<DropdownMenuItem onSelect={onAddCategory}>
							Add category
						</DropdownMenuItem>
					)}
					{onRename && (
						<DropdownMenuItem onSelect={onRename}>
							Rename group
						</DropdownMenuItem>
					)}
					{onDelete && (
						<DropdownMenuItem variant="destructive" onSelect={onDelete}>
							Delete group
						</DropdownMenuItem>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
};

export default BudgetGroupMenu;
