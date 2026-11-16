"use client";

import type { CoachUIMessage } from "@/lib/ai/message-types";
import type { ModelEntry } from "@/lib/ai/models";
import ChatComposer from "./chat-composer";
import ChatEmptyState from "./chat-empty-state";
import ChatMessages from "./chat-messages";
import { useChatComposer } from "./use-chat-composer";
import { useCoachChat } from "./use-coach-chat";

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
		thinking,
		placeholder,
		hasKey,
		approve,
		model,
		selectModel,
	} = useCoachChat({ id, initialMessages, isNew, models });
	const composerHandlers = useChatComposer({ busy, input, setInput, send });

	const composer = (
		<ChatComposer
			{...composerHandlers}
			value={input}
			busy={busy}
			submitted={status === "submitted"}
			onStop={() => stop()}
			disabled={!hasKey || awaitingApproval}
			placeholder={placeholder}
			models={models}
			model={model}
			onModelChange={selectModel}
		/>
	);

	if (messages.length === 0) {
		return (
			<ChatEmptyState
				hasKey={hasKey}
				hasProfile={hasProfile}
				onSuggestion={send}
				composer={composer}
			/>
		);
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<ChatMessages
				messages={messages}
				busy={busy}
				thinking={thinking}
				error={error}
				onApprovalResponse={approve}
				onRetry={(messageId) => regenerate({ messageId })}
				onRetryError={() => regenerate()}
			/>
			{composer}
		</div>
	);
}
