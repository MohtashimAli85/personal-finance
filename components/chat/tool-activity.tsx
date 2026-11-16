"use client";

import { getToolName } from "ai";
import { X } from "lucide-react";
import BrandLoader from "@/components/brand-loader";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Trace,
	TraceCollapsible,
	TraceCollapsibleContent,
	TraceCollapsibleTrigger,
	TraceIcon,
	TraceLine,
	TraceTitle,
} from "@/components/ui/trace";
import type { CoachToolPart, ToolInput } from "./tool-format";
import { readToolLabel } from "./tool-labels";

export default function ToolActivity({ part }: { part: CoachToolPart }) {
	const label = readToolLabel(
		getToolName(part),
		(part.input ?? {}) as ToolInput,
	);
	const done = part.state === "output-available";
	const failed = part.state === "output-error";

	if (!done && !failed) {
		return (
			<Trace className="not-typeset">
				<TraceLine status="running">
					<TraceIcon>
						<BrandLoader />
					</TraceIcon>
					<TraceTitle>{label.active}</TraceTitle>
				</TraceLine>
			</Trace>
		);
	}

	return (
		<Trace className="not-typeset">
			<TraceCollapsible>
				<TraceCollapsibleTrigger>
					<TraceLine status={failed ? "error" : undefined}>
						<TraceIcon>{failed ? <X /> : <label.icon />}</TraceIcon>
						<TraceTitle>{label.done}</TraceTitle>
					</TraceLine>
				</TraceCollapsibleTrigger>
				<TraceCollapsibleContent>
					{failed ? (
						<p className="text-destructive">{part.errorText}</p>
					) : (
						<ScrollArea className="h-64 rounded-md bg-muted">
							<pre className="p-3 text-xs">
								{JSON.stringify(part.output, null, 2)}
							</pre>
						</ScrollArea>
					)}
				</TraceCollapsibleContent>
			</TraceCollapsible>
		</Trace>
	);
}
