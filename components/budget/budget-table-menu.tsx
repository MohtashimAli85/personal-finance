"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBudgetContext } from "@/context/budget-context";

export default function BudgetTableMenu() {
	const { showHidden, setShowHidden } = useBudgetContext();

	return (
		<DropdownMenu>
			<Tooltip>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="icon" aria-label="View options">
							<SlidersHorizontal />
						</Button>
					</DropdownMenuTrigger>
				</TooltipTrigger>
				<TooltipContent>View options</TooltipContent>
			</Tooltip>
			<DropdownMenuContent align="end">
				<DropdownMenuCheckboxItem
					checked={showHidden}
					onCheckedChange={(checked) => setShowHidden(checked === true)}
				>
					Show hidden categories
				</DropdownMenuCheckboxItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
