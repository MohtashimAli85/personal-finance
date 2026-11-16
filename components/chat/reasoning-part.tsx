import type { ReasoningUIPart } from "ai";
import { Brain } from "lucide-react";
import {
	Trace,
	TraceCollapsible,
	TraceCollapsibleContent,
	TraceCollapsibleTrigger,
	TraceIcon,
	TraceLine,
	TraceTitle,
} from "@/components/ui/trace";

export default function ReasoningPart({ part }: { part: ReasoningUIPart }) {
	const streaming = part.state === "streaming";
	return (
		<Trace>
			<TraceCollapsible>
				<TraceCollapsibleTrigger>
					<TraceLine status={streaming ? "running" : undefined}>
						<TraceIcon>
							<Brain />
						</TraceIcon>
						<TraceTitle>
							{streaming ? "Thinking…" : "Thought process"}
						</TraceTitle>
					</TraceLine>
				</TraceCollapsibleTrigger>
				<TraceCollapsibleContent className="whitespace-pre-wrap text-sm">
					{part.text}
				</TraceCollapsibleContent>
			</TraceCollapsible>
		</Trace>
	);
}
