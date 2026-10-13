import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  AddTransactionButton,
  AddTransactionRow,
} from "@/components/transactions/add-transaction";
import { Money } from "@/components/money";
import TransactionCheckbox from "@/components/transactions/transaction-checkbox";
import TransactionList from "@/components/transactions/transaction-list";
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
import { getAccountById } from "@/lib/account";
import { getTransactions } from "@/lib/transaction";

export async function generateMetadata(
  props: PageIdProps,
): Promise<Metadata> {
  const { accountId } = await props.params;
  return { title: getAccountById(accountId)?.name ?? "Account" };
}

export default async function Page(props: PageIdProps) {
  const { accountId } = await props.params;
  const searchParams = await props.searchParams;
  const account = getAccountById(accountId);
  if (!account) {
    notFound();
  }
  const { data, hasMore } = getTransactions({
    ...searchParams,
    accountId,
  });
  return (
    <TransactionProvider accountId={accountId}>
      <TransactionSelectionProvider transactions={data}>
        <Card className="grow">
          <CardHeader>
            <CardTitle>{account.name}</CardTitle>
            <CardDescription>
              <Money value={account.balance} />
            </CardDescription>
            <CardAction>
              <AddTransactionButton />
            </CardAction>
          </CardHeader>
          <CardContent className="grow flex flex-col space-y-4 p-0 overflow-hidden">
            <TransactionToolbar accountId={accountId} />
            <Table>
              <TableHeader>
                <tr>
                  <TableHead className="w-10 pt-1">
                    <TransactionCheckbox shouldSelectAll />
                  </TableHead>
                  <TableHead className="w-30">Date</TableHead>
                  <TableHead className="min-w-50">Notes</TableHead>
                  <TableHead className="w-40">Category</TableHead>
                  <TableHead className="w-30 text-right">Payment</TableHead>
                  <TableHead className="w-30 text-right">Deposit</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                <AddTransactionRow />

                <TransactionList transactions={data} hasMore={hasMore} />
              </TableBody>
            </Table>
            {!data.length && (
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
