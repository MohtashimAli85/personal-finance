import type { ReasoningUIPart } from "ai";
import { ChevronRight } from "lucide-react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function ReasoningPart({ part }: { part: ReasoningUIPart }) {
	const streaming = part.state === "streaming";
	return (
		<Collapsible className="group text-sm text-muted-foreground">
			<CollapsibleTrigger className="flex items-center gap-1.5 select-none hover:text-foreground">
				<ChevronRight className="size-3.5 transition-transform group-data-[state=open]:rotate-90" />
				<span className={streaming ? "shimmer" : undefined}>
					{streaming ? "Thinking…" : "Thought process"}
				</span>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<p className="mt-2 whitespace-pre-wrap border-l-2 pl-3">{part.text}</p>
			</CollapsibleContent>
		</Collapsible>
	);
}
