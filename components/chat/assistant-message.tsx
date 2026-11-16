import { isReasoningUIPart, isStaticToolUIPart, isTextUIPart } from "ai";
import {
	Message,
	MessageContent,
	MessageFooter,
} from "@/components/ui/message";
import type { CoachUIMessage } from "@/lib/ai/message-types";
import { isWriteToolName } from "@/lib/ai/tool-names";
import ApprovalCard from "./approval-card";
import Markdown from "./markdown";
import MessageActions from "./message-actions";
import { messageText } from "./message-text";
import ReasoningPart from "./reasoning-part";
import ToolActivity from "./tool-activity";

export default function AssistantMessage({
	message,
	isStreaming,
	canRetry,
	onApprovalResponse,
	onRetry,
}: {
	message: CoachUIMessage;
	isStreaming: boolean;
	canRetry: boolean;
	onApprovalResponse: (id: string, approved: boolean) => void;
	onRetry: () => void;
}) {
	return (
		<Message>
			<MessageContent className="gap-3">
				{message.parts.map((part, index) => {
					const key = `${message.id}-${index}`;
					if (isTextUIPart(part)) {
						if (!part.text.trim()) return null;
						return (
							<Markdown
								key={key}
								text={part.text}
								isStreaming={isStreaming && part.state === "streaming"}
							/>
						);
					}
					if (isReasoningUIPart(part)) {
						if (!part.text.trim()) return null;
						return <ReasoningPart key={key} part={part} />;
					}
					if (isStaticToolUIPart(part)) {
						const name = part.type.replace(/^tool-/, "");
						return isWriteToolName(name) ? (
							<ApprovalCard
								key={key}
								part={part}
								onRespond={onApprovalResponse}
							/>
						) : (
							<ToolActivity key={key} part={part} />
						);
					}
					return null;
				})}
				{!isStreaming && messageText(message) && (
					<MessageFooter className="px-0">
						<MessageActions
							message={message}
							onRetry={canRetry ? onRetry : undefined}
						/>
					</MessageFooter>
				)}
			</MessageContent>
		</Message>
	);
}
