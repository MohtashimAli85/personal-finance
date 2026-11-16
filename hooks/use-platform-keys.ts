"use client";

import { useIsClient } from "@/hooks/use-is-client";

const isMac = () => /Mac|iPhone|iPad/.test(navigator.userAgent);

export function usePlatformKeys() {
	const mac = !useIsClient() || isMac();
	const symbol = (key: string) =>
		key === "mod"
			? mac
				? "⌘"
				: "Ctrl"
			: key === "shift"
				? mac
					? "⇧"
					: "Shift"
				: key;

	return {
		keys: (keys: string[]) => keys.map(symbol),
		label: (keys: string[]) => keys.map(symbol).join(mac ? "" : "+"),
	};
}
