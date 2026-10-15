"use client";

import { useEffect, useState } from "react";

export function useCopy() {
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!copied) return;
		const timer = setTimeout(() => setCopied(false), 2000);
		return () => clearTimeout(timer);
	}, [copied]);

	const copy = (text: string) =>
		navigator.clipboard.writeText(text).then(() => setCopied(true));

	return { copied, copy };
}
