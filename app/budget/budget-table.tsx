"use client";
import { Fragment, useState } from "react";
import AddCategoryRow from "@/components/budget/add-category-row";
import AddGroupRow from "@/components/budget/add-group-row";
import BudgetCategoryRow from "@/components/budget/budget-category-row";
import { NUMBER_CELL } from "@/components/budget/budget-cells";
import BudgetGroupRow from "@/components/budget/budget-group-row";
import BudgetTableMenu from "@/components/budget/budget-table-menu";
import IncomeRows from "@/components/budget/income-rows";
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useBudgetContext } from "@/context/budget-context";
import { formatCurrency } from "@/lib/helper";

const COLUMNS = [
	{ label: "Budgeted", key: "budgeted" },
	{ label: "Spent", key: "spent" },
	{ label: "Balance", key: "balance" },
] as const;

export default function BudgetTable() {
	const {
		month,
		orderedGroups,
		collapsedGroups,
		totals,
		visibleGroups,
		visibleCategories,
	} = useBudgetContext();
	const [addingCategoryGroupId, setAddingCategoryGroupId] = useState<
		string | null
	>(null);

	return (
		<Table scrollbarOutside className="table-fixed">
			<TableHeader>
				<TableRow>
					<TableHead className="h-12 pl-3">
						<div className="flex items-center justify-between">
							Category
							<BudgetTableMenu />
						</div>
					</TableHead>
					{COLUMNS.map((column) => (
						<TableHead key={column.key} className={`${NUMBER_CELL} h-12`}>
							<div className="text-xs font-normal text-muted-foreground">
								{column.label}
							</div>
							<div className="ml-auto font-semibold" data-money>
								{formatCurrency(totals[column.key])}
							</div>
						</TableHead>
					))}
				</TableRow>
			</TableHeader>
			<TableBody>
				{visibleGroups(orderedGroups).map((group) => {
					const isCollapsed = collapsedGroups[group.id] ?? false;
					return (
						<Fragment key={group.id}>
							<BudgetGroupRow
								group={group}
								onAddCategory={() => setAddingCategoryGroupId(group.id)}
							/>
							{!isCollapsed &&
								visibleCategories(group.categories).map((category) => (
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
				<IncomeRows />
			</TableBody>
		</Table>
	);
}
