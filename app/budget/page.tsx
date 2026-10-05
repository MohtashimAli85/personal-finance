import type { Metadata } from "next";
import { format } from "date-fns";
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
  const selectedDate = new Date(`${month}-01T00:00:00`);
  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-hidden">
      <div className="flex justify-center">
        <MonthPicker key={month} month={month} />
      </div>
      <Card className="gap-0 py-0">
        <CardHeader className="border-b px-4 py-3 text-center">
          <CardTitle>{format(selectedDate, "MMMM")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-1 px-4 py-3">
          <div className="text-sm text-muted-foreground">To Budget:</div>
          <div className="text-4xl font-semibold tracking-tight">
            {formatCurrency(budget.toBudget)}
          </div>
        </CardContent>
      </Card>

      <BudgetProvider month={month} groups={budget.groups}>
        <BudgetTable />
      </BudgetProvider>
    </div>
  );
}
