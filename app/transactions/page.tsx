import type { Metadata } from "next";
import {
	AddTransactionButton,
	AddTransactionRow,
} from "@/components/transactions/add-transaction";
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
import { getDefaultAccountId } from "@/lib/account";
import { toDateKey } from "@/lib/date";
import { getTransactions } from "@/lib/transaction";

export const metadata: Metadata = {
	title: "Transactions",
	description: "View and manage all transactions",
};

export default async function Page(props: SearchPageProps) {
	const searchParams = await props.searchParams;
	const { data: transactions, hasMore } = getTransactions(searchParams);
	const initialCategoryId = searchParams.draftCategoryId || "";
	const initialAccountId =
		searchParams.draftAccountId || getDefaultAccountId() || "";
	const today = toDateKey(new Date());
	const { from, to } = searchParams;
	const initialDate =
		from && (from > today || (to && to <= today)) ? from : undefined;
	const autoInitialize = searchParams.new === "1";
	return (
		<TransactionProvider
			initialCategoryId={initialCategoryId}
			initialAccountId={initialAccountId}
			initialDate={initialDate}
			autoInitialize={autoInitialize}
		>
			<TransactionSelectionProvider transactions={transactions}>
				<Card className="grow">
					<CardHeader>
						<CardTitle>All Accounts</CardTitle>
						<CardDescription>All transactions</CardDescription>
						<CardAction>
							<AddTransactionButton />
						</CardAction>
					</CardHeader>
					<CardContent className="grow flex flex-col space-y-4 p-0 overflow-hidden">
						<TransactionToolbar />
						<Table>
							<TableHeader>
								<tr>
									<TableHead className="w-10 pt-1">
										<TransactionCheckbox shouldSelectAll />
									</TableHead>
									<TableHead className="w-30">Date</TableHead>
									<TableHead className="w-40">Account</TableHead>
									<TableHead className="min-w-50">Notes</TableHead>
									<TableHead className="w-40">Category</TableHead>
									<TableHead className="w-30 text-right">Payment</TableHead>
									<TableHead className="w-30 text-right">Deposit</TableHead>
								</tr>
							</TableHeader>
							<TableBody>
								<AddTransactionRow showAccountCell />

								<TransactionList
									transactions={transactions}
									hasMore={hasMore}
									showAccountCell
								/>
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
