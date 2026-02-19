import {
  AddTransactionButton,
  AddTransactionRow,
} from "@/components/transactions/add-transaction";
import TransactionCheckbox from "@/components/transactions/transaction-checkbox";
import TransactionRow from "@/components/transactions/transaction-row";
import TransactionToolbar from "@/components/transactions/transaction-toolbar";
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
  TableHead,
  TableHeader,
} from "@/components/ui/table";
import TransactionProvider from "@/context/transaction-context";
import { TransactionSelectionProvider } from "@/context/transaction-selection-context";
import { formatCurrency } from "@/lib/helper";
import { fetchAccountById, fetchTransactionsByAccount } from "@/lib/services";

export default async function Page(props: PageIdProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const account = await fetchAccountById(params.accountId);
  if (!account) {
    // todo: implement not found page
    return null;
  }
  const transactions = await fetchTransactionsByAccount(
    params.accountId,
    searchParams,
  );
  console.log({ account });
  return (
    <TransactionProvider>
      <TransactionSelectionProvider transactions={transactions}>
        <Card className="grow">
          <CardHeader>
            <CardTitle>{account.name}</CardTitle>
            <CardDescription>{formatCurrency(account.balance)}</CardDescription>
            <CardAction>
              <AddTransactionButton />
            </CardAction>
          </CardHeader>
          <CardContent className="grow space-y-4 p-0">
            <TransactionToolbar />
            <Table className="border-t ">
              <TableHeader>
                <tr>
                  <TableHead className="w-4 pt-1">
                    <TransactionCheckbox shouldSelectAll />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Payment</TableHead>
                  <TableHead className="text-right">Deposit</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                <AddTransactionRow />

                {transactions.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </TableBody>
            </Table>
            {!transactions.length && (
              <div className="text-center py-10 text-muted-foreground">
                No transactions found. Click &quot;Add Transaction&quot; to
                create one.
              </div>
            )}
          </CardContent>
        </Card>
      </TransactionSelectionProvider>
    </TransactionProvider>
  );
}
