import { useState } from "react";
import { saveHouseExcludedCategories } from "@/app/actions/settings/mutations";
import { useStore } from "@/context/store-context";
import { useServerAction } from "@/hooks/use-server-action";

export function useHouseSpendCategories(excluded: string[]) {
	const groups = useStore((state) =>
		state.groupedCategories.filter((group) => !group.is_income),
	);
	const [skipped, setSkipped] = useState(() => new Set(excluded));
	const { run } = useServerAction();

	const toggle = (id: string, counted: boolean) => {
		const next = new Set(skipped);
		if (counted) next.delete(id);
		else next.add(id);
		setSkipped(next);
		run(() => saveHouseExcludedCategories([...next]));
	};

	return { groups, isCounted: (id: string) => !skipped.has(id), toggle };
}
