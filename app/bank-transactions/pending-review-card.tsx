import type { TransitionStartFunction } from "react";
import TransactionCheckbox from "@/components/transactions/transaction-checkbox";
import {
	Card,
	CardAction,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { TransactionSelectionProvider } from "@/context/transaction-selection-context";
import type { BankTransactionRow } from "@/lib/bank-transaction";
import { plural } from "@/lib/helper";
import PendingBulkActions from "./pending-bulk-actions";
import PendingReviewRow from "./pending-review-row";
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
	const showAccount =
		new Set(pendingTransactions.map((t) => t.account_name)).size > 1;

	return (
		<TransactionSelectionProvider transactions={pendingTransactions}>
			<Card className="gap-0 border-warning/40 pb-0">
				<CardHeader className="pb-3">
					<CardTitle>
						Review {plural(pendingTransactions.length, "transaction")}
					</CardTitle>
					<CardDescription>
						Imported but not in your budget yet. Pick a category and accept, or
						reject to remove.
					</CardDescription>
					<CardAction>
						<PendingBulkActions
							rows={pendingTransactions}
							busy={busyIds.size > 0}
							onAccept={accept}
							onReject={reject}
						/>
					</CardAction>
				</CardHeader>
				<div className="flex items-center gap-3 border-t bg-muted/40 px-4 py-1.5 text-xs text-muted-foreground">
					<TransactionCheckbox shouldSelectAll />
					Select all
				</div>
				<ul>
					{pendingTransactions.map((t) => (
						<PendingReviewRow
							key={t.id}
							transaction={t}
							showAccount={showAccount}
							category={categoryFor(t)}
							busy={busyIds.has(t.id)}
							onCategoryChange={(value) => setCategory(t.id, value)}
							onAccept={() => accept([t])}
							onReject={() => reject([t])}
						/>
					))}
				</ul>
			</Card>
		</TransactionSelectionProvider>
	);
}
