"use client";

import { useCallback, useEffect, useRef } from "react";
import { useQueryState } from "@/hooks/use-query-state";
import { useVirtualizer } from "@/hooks/use-virtualizer";
import TransactionRow from "./transaction-row";

const PAGE_SIZE = 150;
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
  const [limit, setLimit] = useQueryState("limit");
  const hasMoreRef = useRef(hasMore);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const colSpan = showAccountCell ? 7 : 6;

  const getScrollElement = useCallback(() => {
    if (scrollElementRef.current) return scrollElementRef.current;
    // Walk up from the anchor row to find the table-container div
    const el = anchorRef.current?.closest(
      '[data-slot="table-container"]',
    ) as HTMLElement | null;
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

  // Infinite scroll: load more when nearing the end
  useEffect(() => {
    if (!hasMoreRef.current || virtualItems.length === 0) return;
    const lastItem = virtualItems[virtualItems.length - 1];
    if (lastItem && lastItem.index >= transactions.length - 20) {
      const current = Number(limit) || PAGE_SIZE;
      setLimit(String(current + PAGE_SIZE));
    }
  }, [virtualItems, transactions.length, limit, setLimit]);

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
