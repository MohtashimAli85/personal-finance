"use client";

import { useState } from "react";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useQueryParams } from "@/hooks/use-query-params";

export function useTransactionSearch() {
	const { searchParams, setParams, isPending } = useQueryParams();
	const urlValue = searchParams.get("search") ?? "";
	const [value, setValue] = useState(urlValue);
	const [prevUrlValue, setPrevUrlValue] = useState(urlValue);

	if (urlValue !== prevUrlValue) {
		setPrevUrlValue(urlValue);
		if (!urlValue) setValue("");
	}

	const commit = useDebouncedCallback((next: string) =>
		setParams({ search: next.trim(), limit: undefined }),
	);

	const onChange = (next: string) => {
		setValue(next);
		commit(next);
	};

	return { value, onChange, isPending };
}
