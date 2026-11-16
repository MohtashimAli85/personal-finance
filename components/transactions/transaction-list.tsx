"use client";

import { useCallback, useRef } from "react";
import { useVirtualizer } from "@/hooks/use-virtualizer";
import TransactionRow from "./transaction-row";
import { useInfiniteLimit } from "./use-infinite-limit";

const ROW_HEIGHT = 35;
const OVERSCAN = 20;

export default function TransactionList({
	transactions,
	hasMore,
	showAccountCell,
}: {
	transactions: TransactionRow[];
	hasMore: boolean;
	showAccountCell?: boolean;
}) {
	const anchorRef = useRef<HTMLTableRowElement>(null);
	const scrollElementRef = useRef<HTMLElement | null>(null);
	const colSpan = showAccountCell ? 7 : 6;

	const getScrollElement = useCallback(() => {
		if (scrollElementRef.current) return scrollElementRef.current;
		// The viewport owns scrolling; keep the container fallback for other table implementations.
		const el = (anchorRef.current?.closest(
			'[data-slot="scroll-area-viewport"]',
		) ??
			anchorRef.current?.closest(
				'[data-slot="table-container"]',
			)) as HTMLElement | null;
		if (el) scrollElementRef.current = el;
		return el;
	}, []);
	const virtualizer = useVirtualizer({
		count: transactions.length,
		getScrollElement,
		estimateSize: useCallback(() => ROW_HEIGHT, []),
		overscan: OVERSCAN,
		getItemKey: useCallback(
			(index: number) => transactions[index]?.id ?? index,
			[transactions],
		),
	});

	const virtualItems = virtualizer.getVirtualItems();
	const totalSize = virtualizer.getTotalSize();

	useInfiniteLimit(virtualItems.at(-1)?.index, transactions.length, hasMore);

	// Top and bottom spacer heights
	const topSpacerHeight = virtualItems.length > 0 ? virtualItems[0].start : 0;
	const bottomSpacerHeight =
		virtualItems.length > 0
			? totalSize - virtualItems[virtualItems.length - 1].end
			: 0;

	return (
		<>
			{/* Hidden anchor row for DOM traversal to find scroll container */}
			<tr ref={anchorRef} style={{ display: "none" }} />

			{/* Top spacer */}
			{topSpacerHeight > 0 && (
				<tr>
					<td
						colSpan={colSpan}
						style={{ height: topSpacerHeight, padding: 0, border: 0 }}
					/>
				</tr>
			)}

			{/* Virtualized rows */}
			{virtualItems.map((virtualItem) => {
				const tx = transactions[virtualItem.index];
				return (
					<TransactionRow
						key={virtualItem.key}
						tx={tx}
						showAccountCell={showAccountCell}
					/>
				);
			})}

			{/* Bottom spacer */}
			{bottomSpacerHeight > 0 && (
				<tr>
					<td
						colSpan={colSpan}
						style={{ height: bottomSpacerHeight, padding: 0, border: 0 }}
					/>
				</tr>
			)}
		</>
	);
}
