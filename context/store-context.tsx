"use client";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useEffectEvent,
	useState,
	useSyncExternalStore,
} from "react";

export type StoreData = {
	accounts: Account[];
	groupedCategories: GroupedCategory[];
};

type StoreContextType = {
	get: <K extends keyof StoreData>(key: K) => StoreData[K] | undefined;
	set: <K extends keyof StoreData>(key: K, data: StoreData[K]) => void;
	subscribe: (listener: () => void) => () => void;
	getSnapshot: () => StoreData;
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function useStore<T>(selector: (state: StoreData) => T): T {
	const ctx = useContext(StoreContext);
	if (!ctx) throw new Error("useStore must be used within StoreProvider");

	return useSyncExternalStore(
		ctx.subscribe,
		() => selector(ctx.getSnapshot()),
		() => selector(ctx.getSnapshot()),
	);
}

export function useStoreApi(): StoreContextType {
	const ctx = useContext(StoreContext);
	if (!ctx) throw new Error("useStoreApi must be used within StoreProvider");
	return ctx;
}

export default function StoreProvider({
	children,
	initialData,
}: {
	children: ReactNode;
	initialData?: Partial<StoreData>;
}) {
	const [store] = useState(() => {
		const data: Partial<StoreData> = initialData || {};
		const listeners = new Set<() => void>();

		return {
			get: <K extends keyof StoreData>(key: K): StoreData[K] | undefined =>
				data[key],
			set: <K extends keyof StoreData>(key: K, value: StoreData[K]) => {
				data[key] = value;
				listeners.forEach((listener) => {
					listener();
				});
			},
			subscribe: (listener: () => void) => {
				listeners.add(listener);
				return () => listeners.delete(listener);
			},
			getSnapshot: (): StoreData => data as StoreData,
		};
	});
	const onInitialDataChange = useEffectEvent((newData: Partial<StoreData>) => {
		Object.entries(newData).forEach(([key, value]) => {
			store.set(key as keyof StoreData, value as StoreData[keyof StoreData]);
		});
	});
	useEffect(() => {
		if (!initialData) return;
		onInitialDataChange(initialData);
	}, [initialData]);

	return (
		<StoreContext.Provider value={store}>{children}</StoreContext.Provider>
	);
}
