import AmountCell from "@/components/list-table/amount-cell";
import ListCell from "@/components/list-table/list-cell";
import ListEmptyRow from "@/components/list-table/list-empty-row";
import ListTable from "@/components/list-table/list-table";
import { Badge } from "@/components/ui/badge";
import {
	Card,
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
import type { BankTransactionRow } from "@/lib/bank-transaction";
import { formatShortDate } from "@/lib/date";

export default function BankHistoryCard({
	transactions,
	emptyMessage,
}: {
	transactions: BankTransactionRow[];
	emptyMessage: string;
}) {
	return (
		<Card className="gap-0 pb-0">
			<CardHeader className="pb-4">
				<CardTitle>History</CardTitle>
				<CardDescription>
					Everything imported from your bank emails
				</CardDescription>
			</CardHeader>
			<ListTable>
				<TableHeader>
					<TableRow>
						<TableHead>Date</TableHead>
						<TableHead>Description</TableHead>
						<TableHead>Category</TableHead>
						<TableHead>Account</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className="text-right">Amount</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{transactions.map((t) => (
						<TableRow key={t.id}>
							<ListCell className="text-muted-foreground">
								{formatShortDate(t.date)}
							</ListCell>
							<ListCell className="max-w-56 truncate font-medium">
								{t.notes ?? "-"}
							</ListCell>
							<ListCell className="text-muted-foreground">
								{t.category_name ?? "Uncategorized"}
							</ListCell>
							<ListCell className="text-muted-foreground">
								{t.account_name ?? "-"}
							</ListCell>
							<ListCell>
								{t.status === "pending" ? (
									<Badge variant="outline">Pending</Badge>
								) : (
									<span className="text-xs text-muted-foreground">Cleared</span>
								)}
							</ListCell>
							<AmountCell payment={t.payment} deposit={t.deposit} />
						</TableRow>
					))}
					{transactions.length === 0 && (
						<ListEmptyRow colSpan={6}>{emptyMessage}</ListEmptyRow>
					)}
				</TableBody>
			</ListTable>
		</Card>
	);
}
