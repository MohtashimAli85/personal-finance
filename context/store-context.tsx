"use client";
import { createContext, type ReactNode, useContext, useMemo } from "react";

export type StoreData = {
	accounts: Account[];
	groupedCategories: GroupedCategory[];
};

const StoreContext = createContext<Partial<StoreData> | undefined>(undefined);

export function useStore<T>(selector: (state: Partial<StoreData>) => T): T {
	const state = useContext(StoreContext);
	if (!state) throw new Error("useStore must be used within StoreProvider");
	return selector(state);
}

export default function StoreProvider({
	children,
	initialData,
}: {
	children: ReactNode;
	initialData?: Partial<StoreData>;
}) {
	const value = useMemo(() => initialData ?? {}, [initialData]);
	return (
		<StoreContext.Provider value={value}>{children}</StoreContext.Provider>
	);
}
