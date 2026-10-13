import Link from "next/link";
import AmountCell from "@/components/list-table/amount-cell";
import ListCell from "@/components/list-table/list-cell";
import ListEmptyRow from "@/components/list-table/list-empty-row";
import ListTable from "@/components/list-table/list-table";
import {
	Card,
	CardAction,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatShortDate } from "@/lib/date";
import { cn } from "@/lib/tailwindcss/utils";

export default function RecentTransactions({
	transactions,
}: {
	transactions: TransactionRow[];
}) {
	return (
		<Card className="gap-0 pb-0">
			<CardHeader className="pb-4">
				<CardTitle>Recent transactions</CardTitle>
				<CardDescription>Latest entries from all accounts</CardDescription>
				<CardAction>
					<Link
						href="/transactions"
						className="text-sm text-muted-foreground hover:text-foreground"
					>
						View all
					</Link>
				</CardAction>
			</CardHeader>
			<ListTable>
				<TableHeader>
					<TableRow>
						<TableHead>Date</TableHead>
						<TableHead>Category</TableHead>
						<TableHead>Notes</TableHead>
						<TableHead>Account</TableHead>
						<TableHead className="text-right">Amount</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{transactions.map((t) => (
						<TableRow key={t.id}>
							<ListCell className="text-muted-foreground">
								{formatShortDate(t.date)}
							</ListCell>
							<ListCell
								className={cn(
									"font-medium",
									!t.category_name && "text-muted-foreground italic",
								)}
							>
								{t.category_name ?? "Uncategorized"}
							</ListCell>
							<ListCell className="max-w-56 truncate text-muted-foreground">
								{t.notes}
							</ListCell>
							<ListCell className="text-muted-foreground">
								{t.account_name}
							</ListCell>
							<AmountCell payment={t.payment} deposit={t.deposit} />
						</TableRow>
					))}
					{transactions.length === 0 && (
						<ListEmptyRow colSpan={5}>No transactions yet.</ListEmptyRow>
					)}
				</TableBody>
			</ListTable>
		</Card>
	);
}
