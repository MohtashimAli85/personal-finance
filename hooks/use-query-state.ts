"use client";

import { useQueryParams } from "@/hooks/use-query-params";

export function useQueryState(key: string) {
	const { searchParams, setParams } = useQueryParams();
	const setState = (value: string | undefined) => setParams({ [key]: value });

	return [searchParams.get(key) ?? "", setState] as const;
}
