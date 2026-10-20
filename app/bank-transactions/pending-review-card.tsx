import type { TransitionStartFunction } from "react";
import CategoryCombobox from "@/components/categories/category-combobox";
import AmountCell from "@/components/list-table/amount-cell";
import ListCell from "@/components/list-table/list-cell";
import ListTable from "@/components/list-table/list-table";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { BankTransactionRow } from "@/lib/bank-transaction";
import { formatShortDate } from "@/lib/date";
import { usePendingReview } from "./use-pending-review";

export default function PendingReviewCard({
	transactions,
	startTransition,
}: {
	transactions: BankTransactionRow[];
	startTransition: TransitionStartFunction;
}) {
	const {
		pendingTransactions,
		acceptingId,
		categoryFor,
		setCategory,
		accept,
		reject,
	} = usePendingReview(transactions, startTransition);

	if (pendingTransactions.length === 0) return null;

	return (
		<Card className="gap-0 pb-0">
			<CardHeader className="pb-4">
				<CardTitle>Review imported transactions</CardTitle>
				<p className="text-sm text-muted-foreground">
					{pendingTransactions.length} transaction
					{pendingTransactions.length === 1 ? "" : "s"} imported but not yet in
					your budget. Assign a category and accept, or reject to remove it.
				</p>
			</CardHeader>
			<ListTable>
				<TableHeader>
					<TableRow>
						<TableHead>Date</TableHead>
						<TableHead>Description</TableHead>
						<TableHead>Account</TableHead>
						<TableHead className="text-right">Amount</TableHead>
						<TableHead className="w-48">Category</TableHead>
						<TableHead className="w-32">Action</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{pendingTransactions.map((t) => (
						<TableRow key={t.id}>
							<ListCell className="text-muted-foreground">
								{formatShortDate(t.date)}
							</ListCell>
							<ListCell className="max-w-56 truncate font-medium">
								{t.notes ?? "-"}
							</ListCell>
							<ListCell className="text-muted-foreground">
								{t.account_name ?? "-"}
							</ListCell>
							<AmountCell payment={t.payment} deposit={t.deposit} />
							<ListCell>
								<CategoryCombobox
									value={categoryFor(t)}
									label={t.category_name ?? undefined}
									onChange={(value) => setCategory(t.id, value)}
								/>
							</ListCell>
							<ListCell>
								<div className="flex gap-1">
									<Button
										size="sm"
										disabled={acceptingId === t.id}
										onClick={() => accept(t)}
									>
										Accept
									</Button>
									<Button size="sm" variant="outline" onClick={() => reject(t)}>
										Reject
									</Button>
								</div>
							</ListCell>
						</TableRow>
					))}
				</TableBody>
			</ListTable>
		</Card>
	);
}
