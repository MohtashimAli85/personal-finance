import { useState } from "react";

export function useShowHidden() {
	const [showHidden, setShowHidden] = useState(false);

	const visibleCategories = (categories: BudgetCategoryRow[]) =>
		showHidden ? categories : categories.filter((c) => !c.hidden);

	const visibleGroups = (groups: BudgetGroup[]) =>
		showHidden ? groups : groups.filter((g) => !g.hidden);

	return { showHidden, setShowHidden, visibleCategories, visibleGroups };
}
