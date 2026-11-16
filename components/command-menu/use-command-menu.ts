"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { useStore } from "@/context/store-context";
import { useGlobalShortcuts } from "@/hooks/use-global-shortcuts";
import { usePlatformKeys } from "@/hooks/use-platform-keys";
import { usePrivacyMode } from "@/hooks/use-privacy-mode";

export function useCommandMenu() {
	const [open, setOpen] = useState(false);
	const [helpOpen, setHelpOpen] = useState(false);
	const router = useRouter();
	const pathname = usePathname();
	const accounts = useStore((s) => s.accounts);
	const privacy = usePrivacyMode();
	const { toggleSidebar } = useSidebar();
	const { setTheme } = useTheme();
	const platform = usePlatformKeys();

	const run = (action: () => void) => {
		setOpen(false);
		action();
	};

	const addTransaction = () => {
		const base = pathname.startsWith("/transactions")
			? pathname
			: "/transactions";
		router.push(`${base}?new=${Date.now()}`);
	};

	useGlobalShortcuts({
		toggleSearch: () => setOpen((value) => !value),
		togglePrivacy: privacy.toggle,
		addTransaction,
		openHelp: () => setHelpOpen(true),
	});

	return {
		open,
		setOpen,
		run,
		helpOpen,
		setHelpOpen,
		shortcut: platform.label,
		accounts,
		privacy,
		toggleSidebar,
		setTheme,
		addTransaction,
		go: (href: string) => router.push(href),
	};
}
