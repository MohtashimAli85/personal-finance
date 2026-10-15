"use client";

import { useSyncExternalStore } from "react";

type BrowserNavigation = EventTarget & { canGoBack: boolean };

const getNavigation = () =>
	(window as Window & { navigation?: BrowserNavigation }).navigation;

const subscribe = (onChange: () => void) => {
	const navigation = getNavigation();
	// Next's HistoryUpdater calls pushState inside useInsertionEffect, which fires
	// currententrychange synchronously. Defer so React doesn't update mid-insertion.
	const notify = () => queueMicrotask(onChange);
	navigation?.addEventListener("currententrychange", notify);
	return () => navigation?.removeEventListener("currententrychange", notify);
};

export function useCanGoBack() {
	return useSyncExternalStore(
		subscribe,
		() => getNavigation()?.canGoBack ?? window.history.length > 1,
		() => false,
	);
}
