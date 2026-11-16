import { Ban, Check, X } from "lucide-react";
import type { ReactNode } from "react";
import BrandLoader from "@/components/brand-loader";
import { Button } from "@/components/ui/button";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { outcomeText } from "./proposal-rows";
import type { CoachToolPart } from "./tool-format";

type Status = { icon: ReactNode; text: string; className?: string };

const cancelled: Status = { icon: <Ban />, text: "Cancelled." };

function statusOf(part: CoachToolPart, name: string): Status | null {
	switch (part.state) {
		case "input-streaming":
		case "input-available":
			return { icon: <BrandLoader />, text: "Preparing…" };
		case "approval-responded":
			return part.approval.approved
				? { icon: <BrandLoader />, text: "Applying…" }
				: cancelled;
		case "output-available": {
			const failed =
				(part.output as { ok?: boolean } | undefined)?.ok === false;
			return {
				icon: failed ? <X /> : <Check />,
				text: outcomeText(name, part.output),
				className: failed ? "text-destructive" : "text-positive",
			};
		}
		case "output-denied":
			return cancelled;
		case "output-error":
			return {
				icon: <X />,
				text: part.errorText,
				className: "text-destructive",
			};
		default:
			return null;
	}
}

export default function ApprovalStatus({
	part,
	name,
	onRespond,
}: {
	part: CoachToolPart;
	name: string;
	onRespond: (approvalId: string, approved: boolean) => void;
}) {
	if (part.state === "approval-requested") {
		return (
			<div className="flex gap-2">
				<Button size="sm" onClick={() => onRespond(part.approval.id, true)}>
					<Check /> Confirm
				</Button>
				<Button
					size="sm"
					variant="outline"
					onClick={() => onRespond(part.approval.id, false)}
				>
					Cancel
				</Button>
			</div>
		);
	}

	const status = statusOf(part, name);
	if (!status) return null;
	return (
		<Marker className={status.className}>
			<MarkerIcon>{status.icon}</MarkerIcon>
			<MarkerContent>{status.text}</MarkerContent>
		</Marker>
	);
}
