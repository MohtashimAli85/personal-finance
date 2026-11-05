import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export default function PendingRowActions({
	disabled,
	onAccept,
	onReject,
}: {
	disabled: boolean;
	onAccept: () => void;
	onReject: () => void;
}) {
	const actions = [
		{ label: "Accept", icon: Check, onClick: onAccept, className: undefined },
		{
			label: "Reject",
			icon: X,
			onClick: onReject,
			className: "text-destructive",
		},
	];

	return (
		<div className="flex gap-1">
			{actions.map((action) => (
				<Tooltip key={action.label}>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label={action.label}
							disabled={disabled}
							onClick={action.onClick}
						>
							<action.icon className={action.className} />
						</Button>
					</TooltipTrigger>
					<TooltipContent>{action.label}</TooltipContent>
				</Tooltip>
			))}
		</div>
	);
}
