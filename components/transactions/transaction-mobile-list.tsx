"use client";

import { useCallback, useRef } from "react";
import { useTransactionContext } from "@/context/transaction-context";
import { useVirtualizer } from "@/hooks/use-virtualizer";
import TransactionEditSheet from "./transaction-edit-sheet";
import TransactionMobileRow from "./transaction-mobile-row";
import TransactionsEmptyState from "./transactions-empty-state";
import { useEditingTransaction } from "./use-editing-transaction";
import { useInfiniteLimit } from "./use-infinite-limit";

const ROW_HEIGHT = 60;

export default function TransactionMobileList({
	transactions,
	hasMore,
	showAccount,
}: {
	transactions: TransactionRow[];
	hasMore: boolean;
	showAccount: boolean;
}) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const { transaction: draft } = useTransactionContext();
	const edit = useEditingTransaction(transactions);
	const virtualizer = useVirtualizer({
		count: transactions.length,
		getScrollElement: useCallback(() => scrollRef.current, []),
		estimateSize: useCallback(() => ROW_HEIGHT, []),
		overscan: 10,
		getItemKey: useCallback(
			(index: number) => transactions[index]?.id ?? index,
			[transactions],
		),
	});
	const items = virtualizer.getVirtualItems();
	useInfiniteLimit(items.at(-1)?.index, transactions.length, hasMore);

	return (
		<div
			ref={scrollRef}
			className="min-h-0 flex-1 overflow-y-auto border-t md:hidden"
		>
			{transactions.length === 0 && !draft && (
				<div className="py-12">
					<TransactionsEmptyState />
				</div>
			)}
			<div className="relative" style={{ height: virtualizer.getTotalSize() }}>
				{items.map((item) => (
					<TransactionMobileRow
						key={item.key}
						tx={transactions[item.index]}
						showAccount={showAccount}
						style={{ top: item.start, height: ROW_HEIGHT }}
						onOpen={edit.open}
					/>
				))}
			</div>
			<TransactionEditSheet
				tx={edit.editing}
				showAccount={showAccount}
				onClose={edit.close}
			/>
		</div>
	);
}
