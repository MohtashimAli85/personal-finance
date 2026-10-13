"use client";

import CategoryCombobox from "../categories/category-combobox";
import { useIsOffBudget } from "./use-is-off-budget";

export default function TransactionCategory({
	accountId,
	value,
	label,
	onChange,
}: {
	accountId?: string | null;
	value?: string;
	label?: string;
	onChange: (value: string) => void;
}) {
	const offBudget = useIsOffBudget(accountId);

	if (offBudget) {
		return (
			<span className="px-2.5 text-sm italic text-muted-foreground">
				Off budget
			</span>
		);
	}

	return <CategoryCombobox value={value} label={label} onChange={onChange} />;
}
