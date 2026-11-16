"use client";

import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import type { CoachUIMessage } from "@/lib/ai/message-types";
import AssistantMessage from "./assistant-message";
import ChatError from "./chat-error";
import ThinkingIndicator from "./thinking-indicator";
import UserMessage from "./user-message";

export default function ChatMessages({
	messages,
	busy,
	thinking,
	error,
	onApprovalResponse,
	onRetry,
	onRetryError,
}: {
	messages: CoachUIMessage[];
	busy: boolean;
	thinking: boolean;
	error: Error | undefined;
	onApprovalResponse: (id: string, approved: boolean) => void;
	onRetry: (messageId: string) => void;
	onRetryError: () => void;
}) {
	return (
		<MessageScrollerProvider autoScroll defaultScrollPosition="end">
			<MessageScroller className="flex-1">
				<MessageScrollerViewport>
					<MessageScrollerContent className="mx-auto w-full max-w-3xl px-2 py-6">
						{messages.map((message, index) => {
							const isLast = index === messages.length - 1;
							return (
								<MessageScrollerItem
									key={message.id}
									messageId={message.id}
									scrollAnchor={message.role === "user"}
								>
									{message.role === "user" ? (
										<UserMessage message={message} />
									) : (
										<AssistantMessage
											message={message}
											isStreaming={busy && isLast}
											canRetry={isLast && !busy}
											onApprovalResponse={onApprovalResponse}
											onRetry={() => onRetry(message.id)}
										/>
									)}
								</MessageScrollerItem>
							);
						})}
						{thinking && (
							<MessageScrollerItem>
								<ThinkingIndicator />
							</MessageScrollerItem>
						)}
						{error && (
							<MessageScrollerItem>
								<ChatError error={error} onRetry={onRetryError} />
							</MessageScrollerItem>
						)}
					</MessageScrollerContent>
				</MessageScrollerViewport>
				<MessageScrollerButton className="rounded-full shadow-sm" />
			</MessageScroller>
		</MessageScrollerProvider>
	);
}
