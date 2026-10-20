import { useState } from "react";

export function useCollapsedGroups() {
	const [collapsedGroups, setCollapsedGroups] = useState<
		Record<string, boolean>
	>({});

	const toggleCollapsed = (groupId: string) =>
		setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));

	return { collapsedGroups, toggleCollapsed };
}
