import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAccounts } from "@/lib/account";
import { formateDate, getMonthKey, getMonthRange } from "@/lib/date";
import { formatCurrency } from "@/lib/helper";
import { getSummary } from "@/lib/summary";
import { getTransactions } from "@/lib/transaction";

export const metadata: Metadata = {
  title: "Dashboard - Personal Finance",
  description: "Personal finance overview",
};

export default async function DashboardPage() {
  const month = getMonthKey();
  const { start, end } = getMonthRange(month);
  const accounts = getAccounts();
  const summary = getSummary(start, end);
  const { data: recentTransactions } = getTransactions({ limit: "20" });

  const netWorth = accounts.reduce((sum, account) => sum + account.balance, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Net Worth</CardDescription>
            <CardTitle>{formatCurrency(netWorth)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>This Month Income</CardDescription>
            <CardTitle>{formatCurrency(summary.income)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>This Month Expense</CardDescription>
            <CardTitle>{formatCurrency(summary.expense)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Latest entries from all accounts.{" "}
            <Link href="/transactions" className="underline">
              View all
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Payment</TableHead>
                <TableHead className="text-right">Deposit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{formateDate(transaction.date)}</TableCell>
                  <TableCell>{transaction.account_name}</TableCell>
                  <TableCell>{transaction.category_name ?? "-"}</TableCell>
                  <TableCell>{transaction.notes || "-"}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(transaction.payment || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(transaction.deposit || 0)}
                  </TableCell>
                </TableRow>
              ))}
              {recentTransactions.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No transactions yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
