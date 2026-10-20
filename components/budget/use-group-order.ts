import { useEffect, useRef, useState } from "react";

/** The groups in their on-screen order, which a drag can change ahead of the
 * server. Resets whenever the server sends new groups. */
export function useGroupOrder(groups: BudgetGroup[]) {
	const [prevGroups, setPrevGroups] = useState(groups);
	const [groupOrder, setGroupOrder] = useState(() => groups.map((g) => g.id));
	const groupOrderRef = useRef(groupOrder);

	if (prevGroups !== groups) {
		setPrevGroups(groups);
		setGroupOrder(groups.map((g) => g.id));
	}

	useEffect(() => {
		groupOrderRef.current = groupOrder;
	}, [groupOrder]);

	const byId = new Map(groups.map((g) => [g.id, g]));
	const ordered = groupOrder
		.map((id) => byId.get(id))
		.filter((g): g is BudgetGroup => Boolean(g));
	const seen = new Set(ordered.map((g) => g.id));
	const orderedGroups = [...ordered, ...groups.filter((g) => !seen.has(g.id))];

	const reorder = (ids: string[]) => {
		groupOrderRef.current = ids;
		setGroupOrder(ids);
	};

	return { orderedGroups, groupOrderRef, reorder };
}
