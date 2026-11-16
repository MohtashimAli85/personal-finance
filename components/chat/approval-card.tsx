"use client";

import { getToolName } from "ai";
import { ShieldQuestion } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import ApprovalStatus from "./approval-status";
import { PROPOSAL_TITLES, proposalRows } from "./proposal-rows";
import type { CoachToolPart, ToolInput } from "./tool-format";

export default function ApprovalCard({
	part,
	onRespond,
}: {
	part: CoachToolPart;
	onRespond: (approvalId: string, approved: boolean) => void;
}) {
	const name = getToolName(part);
	const rows = proposalRows(name, (part.input ?? {}) as ToolInput);
	const requestReason =
		"approval" in part ? part.approval?.requestReason : undefined;

	return (
		<Card size="sm" className="not-typeset w-full max-w-md">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ShieldQuestion className="size-4 text-info" />
					{PROPOSAL_TITLES[name] ?? name}
				</CardTitle>
				{requestReason && <CardDescription>{requestReason}</CardDescription>}
			</CardHeader>
			{rows.length > 0 && (
				<CardContent>
					<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
						{rows.map((row) => (
							<div key={row.label} className="contents">
								<dt className="text-muted-foreground">{row.label}</dt>
								<dd
									className="font-medium"
									data-money={row.money ? "" : undefined}
								>
									{row.value}
								</dd>
							</div>
						))}
					</dl>
				</CardContent>
			)}
			<CardFooter>
				<ApprovalStatus part={part} name={name} onRespond={onRespond} />
			</CardFooter>
		</Card>
	);
}
