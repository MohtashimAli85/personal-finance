"use client";

import { useTheme } from "next-themes";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsClient } from "@/hooks/use-is-client";
import { THEME_OPTIONS } from "@/lib/theme-options";

export default function AppearanceSetting() {
	const { theme, setTheme } = useTheme();
	const isClient = useIsClient();

	return (
		<ToggleGroup
			type="single"
			variant="outline"
			spacing={0}
			aria-label="Theme"
			value={isClient ? theme : ""}
			onValueChange={(value) => value && setTheme(value)}
		>
			{THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
				<ToggleGroupItem key={value} value={value} className="px-3">
					<Icon />
					{label}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
