import type { TransitionStartFunction } from "react";
import CategoryCombobox from "@/components/categories/category-combobox";
import AmountCell from "@/components/list-table/amount-cell";
import ListCell from "@/components/list-table/list-cell";
import ListTable from "@/components/list-table/list-table";
import TransactionCheckbox from "@/components/transactions/transaction-checkbox";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import {
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { TransactionSelectionProvider } from "@/context/transaction-selection-context";
import type { BankTransactionRow } from "@/lib/bank-transaction";
import { formatShortDate } from "@/lib/date";
import PendingBulkActions from "./pending-bulk-actions";
import PendingRowActions from "./pending-row-actions";
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
		busyIds,
		categoryFor,
		setCategory,
		accept,
		reject,
	} = usePendingReview(transactions, startTransition);

	if (pendingTransactions.length === 0) return null;

	return (
		<TransactionSelectionProvider transactions={pendingTransactions}>
			<Card className="gap-0 pb-0">
				<CardHeader className="pb-4">
					<CardTitle>Review imported transactions</CardTitle>
					<p className="text-sm text-muted-foreground">
						{pendingTransactions.length} transaction
						{pendingTransactions.length === 1 ? "" : "s"} imported but not yet
						in your budget. Assign a category and accept, or reject to remove
						it.
					</p>
					<CardAction>
						<PendingBulkActions
							rows={pendingTransactions}
							busy={busyIds.size > 0}
							onAccept={accept}
							onReject={reject}
						/>
					</CardAction>
				</CardHeader>
				<ListTable>
					<TableHeader>
						<TableRow>
							<TableHead className="w-4">
								<TransactionCheckbox shouldSelectAll />
							</TableHead>
							<TableHead>Date</TableHead>
							<TableHead>Description</TableHead>
							<TableHead>Account</TableHead>
							<TableHead className="text-right">Amount</TableHead>
							<TableHead className="w-48">Category</TableHead>
							<TableHead className="w-20">Action</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{pendingTransactions.map((t) => (
							<TableRow key={t.id} className="group">
								<ListCell>
									<TransactionCheckbox id={t.id} />
								</ListCell>
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
									<PendingRowActions
										disabled={busyIds.has(t.id)}
										onAccept={() => accept([t])}
										onReject={() => reject([t])}
									/>
								</ListCell>
							</TableRow>
						))}
					</TableBody>
				</ListTable>
			</Card>
		</TransactionSelectionProvider>
	);
}
