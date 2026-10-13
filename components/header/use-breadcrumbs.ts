"use client";

import { usePathname } from "next/navigation";
import { isSectionPath, navLinks } from "@/components/sidebar/nav-links";
import { useStore } from "@/context/store-context";

type Crumb = { label: string; href?: string };

export function useBreadcrumbs(): Crumb[] {
	const pathname = usePathname();
	const accounts = useStore((state) => state.accounts);
	const section = navLinks.find((link) => isSectionPath(pathname, link.href));
	if (!section) return [];

	const accountId = pathname.match(/^\/transactions\/([^/]+)/)?.[1];
	const account = accounts?.find((a) => a.id === accountId);
	if (!account) return [{ label: section.label }];

	return [
		{ label: section.label, href: section.href },
		{ label: account.name },
	];
}
