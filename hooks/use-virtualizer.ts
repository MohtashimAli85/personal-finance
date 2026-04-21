"use client";

import {
	useCallback,
	useEffect,
	useEffectEvent,
	useMemo,
	useRef,
	useState,
} from "react";

export interface VirtualItem {
	index: number;
	key: string | number;
	start: number;
	end: number;
	size: number;
}

export interface VirtualizerOptions {
	count: number;
	getScrollElement: () => HTMLElement | null;
	estimateSize: (index: number) => number;
	overscan?: number;
	getItemKey?: (index: number) => string | number;
}

export interface Virtualizer {
	getVirtualItems: () => VirtualItem[];
	getTotalSize: () => number;
	scrollToIndex: (
		index: number,
		options?: { align?: "start" | "center" | "end" },
	) => void;
	scrollToOffset: (offset: number) => void;
	range: { startIndex: number; endIndex: number } | null;
}

export function useVirtualizer(options: VirtualizerOptions): Virtualizer {
	const {
		count,
		getScrollElement,
		estimateSize,
		overscan = 5,
		getItemKey,
	} = options;

	// ------------------------------------------------------------------
	// State that actually drives rendering
	// ------------------------------------------------------------------
	const [scrollTop, setScrollTop] = useState(0);
	const [clientHeight, setClientHeight] = useState(0);
	const [velocity, setVelocity] = useState(0);

	// ------------------------------------------------------------------
	// This implementation assumes uniform item sizes so range math stays
	// O(1). If your items are variable-height, swap this for a
	// prefix-sum / binary-search strategy.
	// ------------------------------------------------------------------
	const itemSize = estimateSize(0);

	// ------------------------------------------------------------------
	// Refs for imperative APIs (scrollToIndex / scrollToOffset).
	// Keeps callbacks stable so consumers don't need to memoize them.
	// ------------------------------------------------------------------
	const latestRef = useRef({ getScrollElement, itemSize });
	latestRef.current = { getScrollElement, itemSize };

	// ------------------------------------------------------------------
	// Velocity bookkeeping (ephemeral, not state-driven)
	// ------------------------------------------------------------------
	const lastScrollTopRef = useRef(0);
	const lastScrollTimeRef = useRef(0);

	const getTotalSize = useCallback(() => {
		return count * itemSize;
	}, [count, itemSize]);

	// ------------------------------------------------------------------
	// Range & items
	// ------------------------------------------------------------------
	const range = useMemo(() => {
		if (count === 0 || clientHeight === 0) return null;

		const startIndex = Math.floor(scrollTop / itemSize);
		const endIndex = Math.min(
			count - 1,
			Math.ceil((scrollTop + clientHeight) / itemSize),
		);

		const dynamicOverscan = Math.min(
			overscan + Math.ceil(Math.abs(velocity) / itemSize),
			overscan * 3,
		);

		return {
			startIndex: Math.max(0, startIndex - dynamicOverscan),
			endIndex: Math.min(count - 1, endIndex + dynamicOverscan),
		};
	}, [scrollTop, clientHeight, count, itemSize, overscan, velocity]);

	const virtualItems = useMemo((): VirtualItem[] => {
		if (!range) return [];

		const items: VirtualItem[] = [];
		const startOffset = range.startIndex * itemSize;

		for (let i = range.startIndex; i <= range.endIndex; i++) {
			const start = startOffset + (i - range.startIndex) * itemSize;
			items.push({
				index: i,
				key: getItemKey ? getItemKey(i) : i,
				start,
				end: start + itemSize,
				size: itemSize,
			});
		}
		return items;
	}, [range, itemSize, getItemKey]);

	// ------------------------------------------------------------------
	// Event handler (useEffectEvent)
	// Reads latest closures without forcing effect re-subscription.
	// ------------------------------------------------------------------
	const onScroll = useEffectEvent(() => {
		const scrollElement = getScrollElement();
		if (!scrollElement) return;

		const now = performance.now();
		const currentScrollTop = scrollElement.scrollTop;
		const dt = now - lastScrollTimeRef.current;

		let nextVelocity = 0;
		if (dt > 0) {
			nextVelocity = (currentScrollTop - lastScrollTopRef.current) / dt;
		}
		lastScrollTopRef.current = currentScrollTop;
		lastScrollTimeRef.current = now;

		// ❌ Removed flushSync — it forces React to render synchronously
		// inside the scroll event, blocking the browser and producing the
		// exact "handler took N ms" violations you saw.
		//
		// ✅ React 18+ automatically batches setState outside React events,
		// so these three updates produce a single re-render.
		setScrollTop(currentScrollTop);
		setClientHeight(scrollElement.clientHeight);
		setVelocity(nextVelocity);
	});

	// ------------------------------------------------------------------
	// Subscribe / unsubscribe / resize observation
	// ------------------------------------------------------------------
	useEffect(() => {
		const scrollElement = getScrollElement();
		if (!scrollElement) return;

		// One-time initial measurement (no rAF + flushSync needed).
		setScrollTop(scrollElement.scrollTop);
		setClientHeight(scrollElement.clientHeight);

		scrollElement.addEventListener("scroll", onScroll, { passive: true });

		const ro = new ResizeObserver(() => {
			setClientHeight(scrollElement.clientHeight);
		});
		ro.observe(scrollElement);

		return () => {
			scrollElement.removeEventListener("scroll", onScroll);
			ro.disconnect();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [getScrollElement]);
	// ^ onScroll is a useEffectEvent — intentionally omitted from deps.

	// ------------------------------------------------------------------
	// Imperative scroll helpers (stable references)
	// ------------------------------------------------------------------
	const scrollToIndex = useCallback(
		(index: number, options?: { align?: "start" | "center" | "end" }) => {
			const el = latestRef.current.getScrollElement();
			if (!el) return;

			const size = latestRef.current.itemSize;
			let offset = index * size;
			const align = options?.align ?? "start";

			if (align === "center") {
				offset = offset - el.clientHeight / 2 + size / 2;
			} else if (align === "end") {
				offset = offset - el.clientHeight + size;
			}

			el.scrollTop = Math.max(0, offset);
		},
		[],
	);

	const scrollToOffset = useCallback((offset: number) => {
		const el = latestRef.current.getScrollElement();
		if (!el) return;
		el.scrollTop = Math.max(0, offset);
	}, []);

	return {
		getVirtualItems: useCallback(() => virtualItems, [virtualItems]),
		getTotalSize,
		scrollToIndex,
		scrollToOffset,
		range,
	};
}
