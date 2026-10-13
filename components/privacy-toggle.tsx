"use client";

import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePrivacyMode } from "@/hooks/use-privacy-mode";

export function PrivacyToggle({ className }: { className?: string }) {
	const { hidden, toggle } = usePrivacyMode();
	const label = hidden ? "Show amounts" : "Hide amounts";

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					onClick={toggle}
					aria-label={label}
					className={className}
				>
					{hidden ? <EyeOff /> : <Eye />}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}
