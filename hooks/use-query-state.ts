"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useQueryState(key: string) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const state = searchParams.get(key) ?? "";

	const setState = (newValue: string | undefined) => {
		const params = new URLSearchParams(searchParams.toString());

		if (newValue === undefined || newValue === "") {
			params.delete(key);
		} else {
			params.set(key, newValue);
		}

		router.replace(`${pathname}?${params.toString()}`, { scroll: false });
	};

	return [state, setState] as const;
}
