import { useRef, useState } from "react";
import { reorderBudgetGroups } from "@/app/actions/budget/mutations";
import { toastOnError } from "@/lib/action-result";
import type { useGroupOrder } from "./use-group-order";

const moveGroup = (groups: BudgetGroup[], fromId: string, toId: string) => {
	const fromIndex = groups.findIndex((g) => g.id === fromId);
	const toIndex = groups.findIndex((g) => g.id === toId);
	if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex)
		return groups;
	const next = [...groups];
	const [moved] = next.splice(fromIndex, 1);
	next.splice(toIndex, 0, moved);
	return next;
};

/** Drag-to-reorder for expense groups; saves the order when the drag ends. */
export function useGroupDrag({
	orderedGroups,
	groupOrderRef,
	reorder,
}: ReturnType<typeof useGroupOrder>) {
	const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null);
	const dragStartOrderRef = useRef<string[] | null>(null);

	const onDragStart = (groupId: string) => {
		setDraggingGroupId(groupId);
		dragStartOrderRef.current = groupOrderRef.current;
	};

	const onDragEnter = (targetGroupId: string) => {
		if (!draggingGroupId || draggingGroupId === targetGroupId) return;
		const dragged = orderedGroups.find((g) => g.id === draggingGroupId);
		const target = orderedGroups.find((g) => g.id === targetGroupId);
		if (!dragged || !target || dragged.is_income || target.is_income) return;
		reorder(
			moveGroup(orderedGroups, draggingGroupId, targetGroupId).map((g) => g.id),
		);
	};

	const onDragEnd = () => {
		const start = dragStartOrderRef.current?.join(",") ?? "";
		const ids = groupOrderRef.current;
		if (start && start !== ids.join(",")) {
			const expense = new Set(
				orderedGroups.filter((g) => !g.is_income).map((g) => g.id),
			);
			toastOnError(reorderBudgetGroups(ids.filter((id) => expense.has(id))));
		}
		setDraggingGroupId(null);
		dragStartOrderRef.current = null;
	};

	return { onDragStart, onDragEnter, onDragEnd };
}
