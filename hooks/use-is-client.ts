"use client";

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

export function useIsClient() {
	return useSyncExternalStore(
		noSubscribe,
		() => true,
		() => false,
	);
}
