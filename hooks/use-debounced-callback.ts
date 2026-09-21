"use client";

import { useEffect, useRef } from "react";

export function useDebouncedCallback<A extends unknown[]>(
	callback: (...args: A) => void,
	delay = 300,
) {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const callbackRef = useRef(callback);

	useEffect(() => {
		callbackRef.current = callback;
	}, [callback]);

	useEffect(
		() => () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		},
		[],
	);

	return (...args: A) => {
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => {
			callbackRef.current(...args);
		}, delay);
	};
}
