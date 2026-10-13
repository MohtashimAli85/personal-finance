import { useEffect, useState } from "react";
import { getCategoryGoal } from "@/app/actions/budget/mutations";

export function useCategoryGoal(categoryId: string, open: boolean) {
	const [goalName, setGoalName] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		getCategoryGoal(categoryId).then((name) => {
			if (!cancelled) setGoalName(name);
		});
		return () => {
			cancelled = true;
		};
	}, [categoryId, open]);

	return goalName;
}
