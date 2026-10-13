"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "privacy-mode";

export function usePrivacyMode() {
	const [hidden, setHidden] = useState<boolean | null>(null);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setHidden(document.documentElement.dataset.privacy === "on");
	}, []);

	const toggle = () => {
		const next = !(hidden ?? false);
		document.documentElement.dataset.privacy = next ? "on" : "off";
		localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
		setHidden(next);
	};

	return { hidden: hidden ?? false, toggle };
}
