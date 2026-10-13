"use client";

import { useSyncExternalStore } from "react";

type BrowserNavigation = EventTarget & { canGoBack: boolean };

const getNavigation = () =>
	(window as Window & { navigation?: BrowserNavigation }).navigation;

const subscribe = (onChange: () => void) => {
	const navigation = getNavigation();
	navigation?.addEventListener("currententrychange", onChange);
	return () => navigation?.removeEventListener("currententrychange", onChange);
};

export function useCanGoBack() {
	return useSyncExternalStore(
		subscribe,
		() => getNavigation()?.canGoBack ?? window.history.length > 1,
		() => false,
	);
}
