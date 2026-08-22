"use client";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import {
  deleteBudgetGroup,
  renameBudgetGroup,
} from "@/app/actions/budget/mutations";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { useBudgetContext } from "@/context/budget-context";
import { useInlineEdit } from "@/hooks/use-inline-edit";
import { formatCurrency } from "@/lib/helper";
import BudgetGroupMenu from "./budget-group-menu";

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
      renameBudgetGroup(group.id, value);
    });

  const isCollapsed = collapsedGroups[group.id] ?? false;
  const canMutateGroup = !group.is_income;

  const groupBudgeted = group.categories.reduce(
    (sum, c) => sum + c.budgeted,
    0,
  );
  const groupActivity = group.categories.reduce(
    (sum, c) => sum + c.activity,
    0,
  );
  const groupBalance = groupBudgeted - groupActivity;

  return (
    <TableRow
      className="group bg-muted/40"
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
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="table"
            size="icon-xs"
            onClick={() => toggleCollapsed(group.id)}
          >
            {isCollapsed ? <ChevronRight /> : <ChevronDown />}
          </Button>
          {canMutateGroup && (
            <GripVertical className="text-muted-foreground size-3.5" />
          )}
          <div ref={containerRef}>
            <input
              data-edit
              key={group.name}
              hidden
              defaultValue={group.name}
              className="outline-none font-semibold"
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
            <span data-view className="font-semibold">
              {group.name}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {canMutateGroup && (
              <BudgetGroupMenu
                onAddCategory={onAddCategory}
                onRename={startEditing}
                onDelete={
                  group.can_delete && canMutateGroup
                    ? () => deleteBudgetGroup(group.id)
                    : undefined
                }
              />
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right font-semibold">
        {formatCurrency(groupBudgeted)}
      </TableCell>
      <TableCell className="text-right font-semibold">
        {formatCurrency(groupActivity)}
      </TableCell>
      <TableCell className="text-right font-semibold">
        {formatCurrency(groupBalance)}
      </TableCell>
    </TableRow>
  );
};

export default BudgetGroupRow;
