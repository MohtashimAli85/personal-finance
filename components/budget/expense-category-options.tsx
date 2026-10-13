"use client";

import { SelectGroup, SelectItem, SelectLabel } from "@/components/ui/select";
import { useBudgetContext } from "@/context/budget-context";

export default function ExpenseCategoryOptions({
	excludeId,
}: {
	excludeId: string;
}) {
	const { orderedGroups } = useBudgetContext();

	return orderedGroups
		.filter((group) => !group.is_income)
		.map((group) => (
			<SelectGroup key={group.id}>
				<SelectLabel>{group.name}</SelectLabel>
				{group.categories
					.filter((c) => c.id !== excludeId)
					.map((c) => (
						<SelectItem key={c.id} value={c.id}>
							{c.name}
						</SelectItem>
					))}
			</SelectGroup>
		));
}
