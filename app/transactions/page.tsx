import { getAllTransactions } from "@/app/actions/transaction/queries";
import {
  AddTransactionButton,
  AddTransactionRow,
} from "@/components/transactions/add-transaction";
import TransactionRow from "@/components/transactions/transaction-row";
import {
  Card,
  CardAction,
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
import TransactionProvider from "@/context/transaction-context";
import { Fragment } from "react/jsx-runtime";

export default async function Page() {
  const transactions = await getAllTransactions(200, 0);
  return (
    <TransactionProvider>
      <Card className="grow">
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>All transactions</CardDescription>
          <CardAction>
            <AddTransactionButton />
          </CardAction>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Payment</TableHead>
                <TableHead className="text-right">Deposit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AddTransactionRow />
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={7}>
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TransactionProvider>
  );
}
