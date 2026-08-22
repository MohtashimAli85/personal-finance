import type { Metadata } from "next";
import BudgetTable from "@/app/budget/budget-table";
import MonthPicker from "@/app/budget/month-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BudgetProvider from "@/context/budget-context";
import { getBudgetView } from "@/lib/budget";
import { getMonthKey, isMonthKey } from "@/lib/date";
import { formatCurrency } from "@/lib/helper";

export const metadata: Metadata = {
  title: "Budget - Personal Finance",
  description: "Envelope-style monthly budget",
};

export default async function BudgetPage(props: SearchPageProps) {
  const searchParams = await props.searchParams;
  const monthParam = searchParams.month;
  const month =
    monthParam && isMonthKey(monthParam) ? monthParam : getMonthKey();
  const budget = getBudgetView(month);
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="border-b flex-row items-start justify-between space-y-0 gap-4">
          <div>
            <CardTitle>Budget</CardTitle>
          </div>
          <MonthPicker key={month} month={month} />
        </CardHeader>
        <CardContent className="space-y-2 pt-5">
          <div className="text-sm text-muted-foreground">To Budget:</div>
          <div className="text-4xl font-semibold tracking-tight">
            {formatCurrency(budget.toBudget)}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Available funds: {formatCurrency(budget.totalBalance)} | Budgeted:{" "}
            {formatCurrency(budget.totalBudgeted)} | Month: {budget.month}
          </div>
        </CardContent>
      </Card>

      <BudgetProvider month={month} groups={budget.groups}>
        <BudgetTable />
      </BudgetProvider>
    </div>
  );
}
