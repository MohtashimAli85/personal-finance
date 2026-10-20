"use client";
import { createContext, type ReactNode, useContext } from "react";

export type StoreData = {
	accounts: Account[];
	groupedCategories: GroupedCategory[];
};

const StoreContext = createContext<StoreData | undefined>(undefined);

export function useStore<T>(selector: (state: StoreData) => T): T {
	const state = useContext(StoreContext);
	if (!state) throw new Error("useStore must be used within StoreProvider");
	return selector(state);
}

export default function StoreProvider({
	children,
	initialData,
}: {
	children: ReactNode;
	initialData: StoreData;
}) {
	return (
		<StoreContext.Provider value={initialData}>
			{children}
		</StoreContext.Provider>
	);
}
