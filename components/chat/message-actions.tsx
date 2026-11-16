import { Check, Copy, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
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
	onRetry,
}: {
	message: CoachUIMessage;
	onRetry?: () => void;
}) {
	const { copied, copy } = useCopy();
	const actions = [
		{
			label: copied ? "Copied" : "Copy",
			icon: copied ? Check : Copy,
			onClick: () => copy(messageText(message)),
		},
		...(onRetry ? [{ label: "Retry", icon: RotateCcw, onClick: onRetry }] : []),
	];
	const model = message.metadata?.model;

	return (
		<div className="flex items-center gap-2">
			<ButtonGroup>
				{actions.map((action) => (
					<Tooltip key={action.label}>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon-xs"
								className="text-muted-foreground"
								aria-label={action.label}
								onClick={action.onClick}
							>
								<action.icon />
							</Button>
						</TooltipTrigger>
						<TooltipContent>{action.label}</TooltipContent>
					</Tooltip>
				))}
			</ButtonGroup>
			{model && (
				<Badge variant="outline" className="font-normal text-muted-foreground">
					{modelLabel(model)}
				</Badge>
			)}
		</div>
	);
}
