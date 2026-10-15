import { Check, Copy, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { modelLabel } from "@/lib/ai/labels";
import type { CoachUIMessage } from "@/lib/ai/message-types";
import { messageText } from "./message-text";
import { useCopy } from "./use-copy";

export default function MessageActions({
	message,
	canRetry,
	onRetry,
}: {
	message: CoachUIMessage;
	canRetry: boolean;
	onRetry: () => void;
}) {
	const { copied, copy } = useCopy();
	const actions = [
		{
			label: "Copy",
			icon: copied ? Check : Copy,
			onClick: () => copy(messageText(message)),
		},
		...(canRetry
			? [{ label: "Retry", icon: RotateCcw, onClick: onRetry }]
			: []),
	];
	const model = message.metadata?.model;

	return (
		<div className="flex items-center gap-1">
			{actions.map((action) => (
				<Tooltip key={action.label}>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon-xs"
							aria-label={action.label}
							onClick={action.onClick}
						>
							<action.icon />
						</Button>
					</TooltipTrigger>
					<TooltipContent>{action.label}</TooltipContent>
				</Tooltip>
			))}
			{model && (
				<Badge variant="secondary" className="ml-1 font-normal">
					{modelLabel(model)}
				</Badge>
			)}
		</div>
	);
}
