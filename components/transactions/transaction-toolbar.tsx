"use client";

import { Money } from "@/components/money";
import { useTransactionSelection } from "@/context/transaction-selection-context";
import { plural } from "@/lib/helper";
import type { TransactionTotals } from "@/lib/transaction";
import TransactionDelete from "./transaction-delete";
import TransactionFilterChips from "./transaction-filter-chips";
import TransactionSearch from "./transaction-search";
import { useTransactionFilters } from "./use-transaction-filters";

export default function TransactionToolbar({
	totals,
}: {
	totals: TransactionTotals;
}) {
	const { selectedIds } = useTransactionSelection();
	const { filtered } = useTransactionFilters();

	return (
		<div className="flex flex-wrap items-center gap-2 p-2">
			<TransactionSearch />
			<TransactionFilterChips />
			<div className="ml-auto flex items-center gap-4 pr-2 text-sm text-muted-foreground">
				{selectedIds.size > 0 ? (
					<TransactionDelete />
				) : (
					<>
						{filtered && totals.count > 0 && (
							<span className="flex gap-3">
								<span>
									In <Money value={totals.deposit} className="text-positive" />
								</span>
								<span>
									Out{" "}
									<Money value={totals.payment} className="text-foreground" />
								</span>
							</span>
						)}
						<span>
							{filtered
								? plural(totals.count, "match", "matches")
								: plural(totals.count, "transaction")}
						</span>
					</>
				)}
			</div>
		</div>
	);
}
