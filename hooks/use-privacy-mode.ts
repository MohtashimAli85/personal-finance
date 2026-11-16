"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "privacy-mode";

const subscribe = (onChange: () => void) => {
	const observer = new MutationObserver(onChange);
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["data-privacy"],
	});
	return () => observer.disconnect();
};

const isHidden = () => document.documentElement.dataset.privacy === "on";

export function usePrivacyMode() {
	const hidden = useSyncExternalStore(subscribe, isHidden, () => false);

	const toggle = () => {
		const next = isHidden() ? "off" : "on";
		document.documentElement.dataset.privacy = next;
		localStorage.setItem(STORAGE_KEY, next);
	};

	return { hidden, toggle };
}
