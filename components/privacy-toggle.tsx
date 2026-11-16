"use client";

import { Eye, EyeOff } from "lucide-react";
import ShortcutKeys from "@/components/shortcut-keys";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePrivacyMode } from "@/hooks/use-privacy-mode";
import { SHORTCUTS } from "@/lib/shortcuts";

export function PrivacyToggle({ className }: { className?: string }) {
	const { hidden, toggle } = usePrivacyMode();
	const label = hidden ? "Show amounts" : "Hide amounts";

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={toggle}
					aria-label={label}
					className={className}
				>
					{hidden ? <EyeOff /> : <Eye />}
				</Button>
			</TooltipTrigger>
			<TooltipContent className="flex items-center gap-2">
				{label}
				<ShortcutKeys keys={SHORTCUTS.privacy.keys} />
			</TooltipContent>
		</Tooltip>
	);
}
