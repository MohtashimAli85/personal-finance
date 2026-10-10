"use client";

import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBudgetContext } from "@/context/budget-context";

export default function BudgetTableMenu() {
	const { showHidden, setShowHidden } = useBudgetContext();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon-xs" aria-label="Budget options">
					<MoreVertical />
				</Button>
			</DropdownMenuTrigger>
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
