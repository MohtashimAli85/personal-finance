"use client";

import { useEffect } from "react";
import { useQueryState } from "@/hooks/use-query-state";

const PAGE_SIZE = 150;
const PREFETCH_ROWS = 20;

export function useInfiniteLimit(
	lastVisibleIndex: number | undefined,
	loaded: number,
	hasMore: boolean,
) {
	const [, setLimit] = useQueryState("limit");

	useEffect(() => {
		if (!hasMore || lastVisibleIndex === undefined) return;
		if (lastVisibleIndex >= loaded - PREFETCH_ROWS) {
			setLimit(String(loaded + PAGE_SIZE));
		}
	}, [lastVisibleIndex, loaded, hasMore, setLimit]);
}
