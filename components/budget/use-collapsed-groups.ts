import { useState } from "react";
import { COLLAPSED_COOKIE, serializeCollapsed } from "@/lib/budget-view-prefs";
import { setCookie } from "@/lib/cookie";

export function useCollapsedGroups(initial: Record<string, boolean>) {
	const [collapsedGroups, setCollapsedGroups] = useState(initial);

	const toggleCollapsed = (groupId: string) => {
		const next = { ...collapsedGroups, [groupId]: !collapsedGroups[groupId] };
		setCollapsedGroups(next);
		setCookie(COLLAPSED_COOKIE, serializeCollapsed(next));
	};

	return { collapsedGroups, toggleCollapsed };
}
