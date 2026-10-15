import type { CoachUIMessage } from "@/lib/ai/message-types";
import { messageText } from "./message-text";

export default function UserMessage({ message }: { message: CoachUIMessage }) {
	const createdAt = message.metadata?.createdAt;
	return (
		<div className="group ml-auto flex max-w-[80%] flex-col items-end gap-1">
			<div className="whitespace-pre-wrap rounded-2xl bg-muted px-4 py-2">
				{messageText(message)}
			</div>
			{createdAt && (
				<time className="text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
					{new Date(createdAt).toLocaleTimeString([], {
						hour: "numeric",
						minute: "2-digit",
					})}
				</time>
			)}
		</div>
	);
}
