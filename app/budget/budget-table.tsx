"use client";
import { Fragment, useState } from "react";
import AddCategoryRow from "@/components/budget/add-category-row";
import AddGroupRow from "@/components/budget/add-group-row";
import BudgetCategoryRow from "@/components/budget/budget-category-row";
import BudgetGroupRow from "@/components/budget/budget-group-row";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBudgetContext } from "@/context/budget-context";
import { formatCurrency } from "@/lib/helper";

export default function BudgetTable() {
  const { month, orderedGroups, collapsedGroups } = useBudgetContext();
  const [addingCategoryGroupId, setAddingCategoryGroupId] = useState<
    string | null
  >(null);
  const totals = orderedGroups.reduce(
    (result, group) => {
      for (const category of group.categories) {
        result.budgeted += category.budgeted;
        result.activity += category.activity;
        result.available += category.available;
      }
      return result;
    },
    { budgeted: 0, activity: 0, available: 0 },
  );

  return (
    <Table scrollbarOutside>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[30%]">Category</TableHead>
          <TableHead className="w-[23.333%] text-right">
            <div>Budgeted</div>
            <div className="font-semibold">{formatCurrency(totals.budgeted)}</div>
          </TableHead>
          <TableHead className="w-[23.333%] text-right">
            <div>Spent</div>
            <div className="font-semibold">{formatCurrency(totals.activity)}</div>
          </TableHead>
          <TableHead className="w-[23.333%] text-right">
            <div>Balance</div>
            <div className="font-semibold">{formatCurrency(totals.available)}</div>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orderedGroups.map((group) => {
          const isCollapsed = collapsedGroups[group.id] ?? false;
          return (
            <Fragment key={group.id}>
              <BudgetGroupRow
                group={group}
                onAddCategory={() => setAddingCategoryGroupId(group.id)}
              />
              {!isCollapsed &&
                group.categories.map((category) => (
                  <BudgetCategoryRow
                    key={category.id}
                    category={category}
                    month={month}
                  />
                ))}
              {!isCollapsed && (
                <AddCategoryRow
                  groupId={group.id}
                  isAdding={addingCategoryGroupId === group.id}
                  onDone={() => setAddingCategoryGroupId(null)}
                />
              )}
            </Fragment>
          );
        })}
        <AddGroupRow />
      </TableBody>
    </Table>
  );
}
