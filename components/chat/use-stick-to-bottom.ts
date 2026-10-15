"use client";

import { useEffect, useRef, useState } from "react";

const NEAR_BOTTOM_PX = 48;

export function useStickToBottom() {
	const containerRef = useRef<HTMLDivElement>(null);
	const endRef = useRef<HTMLDivElement>(null);
	const atBottomRef = useRef(true);
	const [isAtBottom, setIsAtBottom] = useState(true);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const onScroll = () => {
			const distance =
				container.scrollHeight - container.scrollTop - container.clientHeight;
			atBottomRef.current = distance < NEAR_BOTTOM_PX;
			setIsAtBottom(atBottomRef.current);
		};
		container.addEventListener("scroll", onScroll, { passive: true });
		return () => container.removeEventListener("scroll", onScroll);
	}, []);

	useEffect(() => {
		if (atBottomRef.current) endRef.current?.scrollIntoView({ block: "end" });
	});

	const scrollToBottom = () =>
		endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });

	return { containerRef, endRef, isAtBottom, scrollToBottom };
}
