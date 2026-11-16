import { useState } from "react";
import { SHOW_HIDDEN_COOKIE } from "@/lib/budget-view-prefs";
import { setCookie } from "@/lib/cookie";

export function useShowHidden(initial: boolean) {
	const [showHidden, setShown] = useState(initial);

	const setShowHidden = (next: boolean) => {
		setShown(next);
		setCookie(SHOW_HIDDEN_COOKIE, next ? "1" : "");
	};

	const visibleCategories = (categories: BudgetCategoryRow[]) =>
		showHidden ? categories : categories.filter((c) => !c.hidden);

	const visibleGroups = (groups: BudgetGroup[]) =>
		showHidden ? groups : groups.filter((g) => !g.hidden);

	return { showHidden, setShowHidden, visibleCategories, visibleGroups };
}
