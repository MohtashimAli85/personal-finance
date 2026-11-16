import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
	Message,
	MessageContent,
	MessageFooter,
} from "@/components/ui/message";
import type { CoachUIMessage } from "@/lib/ai/message-types";
import MessageActions from "./message-actions";
import { messageText } from "./message-text";

export default function UserMessage({ message }: { message: CoachUIMessage }) {
	const createdAt = message.metadata?.createdAt;
	return (
		<Message align="end">
			<MessageContent>
				<Bubble variant="muted" align="end">
					<BubbleContent className="whitespace-pre-wrap rounded-2xl px-4">
						{messageText(message)}
					</BubbleContent>
				</Bubble>
				<MessageFooter className="gap-2 px-1 opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100">
					{createdAt && (
						<time className="font-normal">
							{new Date(createdAt).toLocaleTimeString([], {
								hour: "numeric",
								minute: "2-digit",
							})}
						</time>
					)}
					<MessageActions message={message} />
				</MessageFooter>
			</MessageContent>
		</Message>
	);
}
