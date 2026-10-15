"use client";

import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CoachUIMessage } from "@/lib/ai/message-types";
import type { ModelEntry } from "@/lib/ai/models";
import { cn } from "@/lib/tailwindcss/utils";
import AssistantMessage from "./assistant-message";
import ChatComposer from "./chat-composer";
import ChatEmptyState from "./chat-empty-state";
import ChatError from "./chat-error";
import ThinkingIndicator from "./thinking-indicator";
import { useChatComposer } from "./use-chat-composer";
import { useCoachChat } from "./use-coach-chat";
import { useStickToBottom } from "./use-stick-to-bottom";
import UserMessage from "./user-message";

export default function ChatView({
	id,
	initialMessages,
	isNew,
	models,
	hasProfile,
}: {
	id: string;
	initialMessages: CoachUIMessage[];
	isNew: boolean;
	models: ModelEntry[];
	hasProfile: boolean;
}) {
	const {
		messages,
		status,
		error,
		regenerate,
		stop,
		input,
		setInput,
		send,
		busy,
		awaitingApproval,
		lastMessage,
		hasKey,
		approve,
		model,
		selectModel,
	} = useCoachChat({ id, initialMessages, isNew, models });
	const isEmpty = messages.length === 0;
	const { containerRef, endRef, isAtBottom, scrollToBottom } =
		useStickToBottom();
	const composer = useChatComposer({ busy, input, setInput, send });

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="relative flex min-h-0 flex-1 flex-col">
				{isEmpty && (
					<ChatEmptyState
						hasKey={hasKey}
						hasProfile={hasProfile}
						onSuggestion={send}
					/>
				)}
				<div
					ref={containerRef}
					className={cn("min-h-0 flex-1 overflow-y-auto", isEmpty && "hidden")}
				>
					<div className="mx-auto flex max-w-3xl flex-col gap-6 px-2 py-4">
						{messages.map((message, index) => {
							const isLast = index === messages.length - 1;
							return message.role === "user" ? (
								<UserMessage key={message.id} message={message} />
							) : (
								<AssistantMessage
									key={message.id}
									message={message}
									isStreaming={busy && isLast}
									canRetry={isLast && !busy}
									onApprovalResponse={approve}
									onRetry={() => regenerate({ messageId: message.id })}
								/>
							);
						})}
						{status === "submitted" && lastMessage?.role === "user" && (
							<ThinkingIndicator />
						)}
						{error && <ChatError error={error} onRetry={() => regenerate()} />}
						<div ref={endRef} />
					</div>
				</div>
				{!isEmpty && !isAtBottom && (
					<Button
						variant="outline"
						size="icon"
						className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background shadow-sm"
						onClick={scrollToBottom}
						aria-label="Scroll to latest"
					>
						<ArrowDown />
					</Button>
				)}
			</div>
			<ChatComposer
				{...composer}
				value={input}
				busy={busy}
				submitted={status === "submitted"}
				onStop={() => stop()}
				disabled={!hasKey || awaitingApproval}
				placeholder={
					!hasKey
						? "Add an API key in Settings to start"
						: awaitingApproval
							? "Confirm or cancel the change above first"
							: "Ask about your budget or a savings plan…"
				}
				models={models}
				model={model}
				onModelChange={selectModel}
			/>
		</div>
	);
}
