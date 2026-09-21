"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "privacy-mode";

export function PrivacyToggle() {
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

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={toggle}
			aria-label={hidden ? "Show amounts" : "Hide amounts"}
		>
			{hidden ? <EyeOff /> : <Eye />}
		</Button>
	);
}
