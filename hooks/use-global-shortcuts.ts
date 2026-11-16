"use client";

import { useEffect, useEffectEvent } from "react";

const isTyping = (target: EventTarget | null) =>
	target instanceof HTMLElement &&
	(target.isContentEditable ||
		["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

const isDialogOpen = () =>
	document.querySelector(
		'[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
	) !== null;

export function useGlobalShortcuts(handlers: {
	toggleSearch: () => void;
	togglePrivacy: () => void;
	addTransaction: () => void;
	openHelp: () => void;
}) {
	const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
		const mod = event.metaKey || event.ctrlKey;
		const handle = (action: () => void) => {
			event.preventDefault();
			action();
		};

		if (mod && !event.shiftKey && event.code === "KeyK") {
			return handle(handlers.toggleSearch);
		}
		if (mod && event.shiftKey && event.code === "KeyH") {
			return handle(handlers.togglePrivacy);
		}
		if (mod || event.altKey || isTyping(event.target) || isDialogOpen()) return;
		if (event.key === "?") return handle(handlers.openHelp);
		if (!event.shiftKey && event.code === "KeyN") {
			return handle(handlers.addTransaction);
		}
	});

	useEffect(() => {
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);
}
