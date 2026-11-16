"use client";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { renameBudgetGroup } from "@/app/actions/budget/mutations";
import ConfirmDialog from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { useBudgetContext } from "@/context/budget-context";
import { useInlineEdit } from "@/hooks/use-inline-edit";
import { toastOnError } from "@/lib/action-result";
import { formatCurrency } from "@/lib/helper";
import { cn } from "@/lib/tailwindcss/utils";
import { NUMBER_CELL, SPENT_CELL } from "./budget-cells";
import BudgetGroupMenu from "./budget-group-menu";
import { groupTotals } from "./group-totals";
import { useDeleteGroup } from "./use-delete-group";

const BudgetGroupRow = ({
	group,
	onAddCategory,
}: {
	group: BudgetGroup;
	onAddCategory: () => void;
}) => {
	const {
		collapsedGroups,
		toggleCollapsed,
		onDragStart,
		onDragEnter,
		onDragEnd,
	} = useBudgetContext();

	const { containerRef, startEditing, handleBlur, handleKeyDown } =
		useInlineEdit((value) => {
			toastOnError(renameBudgetGroup({ groupId: group.id, name: value }));
		});

	const removeGroup = useDeleteGroup(group.id);
	const isCollapsed = collapsedGroups[group.id] ?? false;
	const canMutateGroup = !group.is_income;

	const totals = groupTotals(group.categories);

	return (
		<TableRow
			className={cn("group bg-muted/40", group.hidden && "opacity-50")}
			draggable={canMutateGroup}
			onDragStart={() => canMutateGroup && onDragStart(group.id)}
			onDragEnter={() => onDragEnter(group.id)}
			onDragOver={(e) => {
				if (!canMutateGroup) return;
				e.preventDefault();
				e.dataTransfer.dropEffect = "move";
			}}
			onDrop={() => onDragEnter(group.id)}
			onDragEnd={onDragEnd}
		>
			<TableCell className="h-8 pl-1">
				<div className="flex items-center gap-1">
					<Button
						type="button"
						variant="table"
						size="icon-xs"
						aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${group.name}`}
						onClick={() => toggleCollapsed(group.id)}
					>
						{isCollapsed ? <ChevronRight /> : <ChevronDown />}
					</Button>
					<div ref={containerRef}>
						<input
							data-edit
							key={group.name}
							hidden
							aria-label="Group name"
							defaultValue={group.name}
							className="outline-none font-semibold"
							onBlur={handleBlur}
							onKeyDown={handleKeyDown}
						/>
						<span data-view className="font-semibold">
							{group.name}
						</span>
					</div>
					<div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 has-data-[state=open]:opacity-100">
						{canMutateGroup && (
							<GripVertical className="size-3.5 cursor-grab text-muted-foreground" />
						)}
						{canMutateGroup && (
							<BudgetGroupMenu
								name={group.name}
								onAddCategory={onAddCategory}
								onRename={startEditing}
								onDelete={group.can_delete ? removeGroup.request : undefined}
							/>
						)}
					</div>
				</div>
				<ConfirmDialog
					open={removeGroup.open}
					onOpenChange={removeGroup.setOpen}
					title={`Delete ${group.name}?`}
					description="The group is empty, so no categories or budget amounts are lost."
					onConfirm={removeGroup.confirm}
				/>
			</TableCell>
			<TableCell className={cn(NUMBER_CELL, "font-semibold")} data-money>
				{formatCurrency(totals.budgeted)}
			</TableCell>
			<TableCell
				className={cn(NUMBER_CELL, SPENT_CELL, "font-semibold")}
				data-money
			>
				{formatCurrency(totals.spent)}
			</TableCell>
			<TableCell className={cn(NUMBER_CELL, "font-semibold")} data-money>
				{formatCurrency(totals.balance)}
			</TableCell>
		</TableRow>
	);
};

export default BudgetGroupRow;
