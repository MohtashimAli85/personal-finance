import { useBudgetContext } from "@/context/budget-context";
import { TO_BUDGET } from "@/lib/budget-targets";

export interface TransferTarget {
	value: string;
	label: string;
	balance: number;
}

export function useTransferTargets(excludeId: string) {
	const { orderedGroups, toBudget } = useBudgetContext();

	return [
		{
			id: TO_BUDGET,
			name: "To Budget",
			items: [{ value: TO_BUDGET, label: "To Budget", balance: toBudget }],
		},
		...orderedGroups
			.filter((group) => !group.is_income)
			.map((group) => ({
				id: group.id,
				name: group.name,
				items: group.categories
					.filter((c) => c.id !== excludeId)
					.map((c) => ({ value: c.id, label: c.name, balance: c.balance })),
			}))
			.filter((group) => group.items.length > 0),
	];
}
