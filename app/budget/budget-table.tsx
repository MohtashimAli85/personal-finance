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

export default function BudgetTable() {
  const { month, orderedGroups, collapsedGroups } = useBudgetContext();
  const [addingCategoryGroupId, setAddingCategoryGroupId] = useState<
    string | null
  >(null);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Budgeted</TableHead>
          <TableHead className="text-right">Spent</TableHead>
          <TableHead className="text-right">Balance</TableHead>
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
