"use client";

import { useStore } from "@/context/store-context";

export function useIsOffBudget(accountId?: string | null) {
	return useStore(
		(state) =>
			state.accounts?.find((account) => account.id === accountId)
				?.account_type === "off_budget",
	);
}
