import { Spinner } from "@/components/ui/spinner";
import AssistantAvatar from "./assistant-avatar";

export default function ThinkingIndicator() {
	return (
		<div className="flex items-center gap-3">
			<AssistantAvatar />
			<div className="flex items-center gap-2 text-sm">
				<Spinner className="text-muted-foreground" />
				<span className="shimmer">Thinking…</span>
			</div>
		</div>
	);
}
