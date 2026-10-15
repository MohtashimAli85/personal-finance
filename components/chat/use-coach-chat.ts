"use client";

import { useChat } from "@ai-sdk/react";
import {
	DefaultChatTransport,
	isToolUIPart,
	lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import { useRef, useState } from "react";
import { AUTO_MODEL } from "@/lib/ai/labels";
import type { CoachUIMessage } from "@/lib/ai/message-types";
import type { ModelEntry } from "@/lib/ai/models";
import { useChatShell } from "./chat-shell";

export function useCoachChat({
	id,
	initialMessages,
	isNew,
	models,
}: {
	id: string;
	initialMessages: CoachUIMessage[];
	isNew: boolean;
	models: ModelEntry[];
}) {
	const { refreshChats } = useChatShell();
	const [input, setInput] = useState("");
	const [model, setModel] = useState(AUTO_MODEL);
	const modelRef = useRef(AUTO_MODEL);
	const [transport] = useState(
		() =>
			new DefaultChatTransport({
				api: "/api/chat",
				prepareSendMessagesRequest: ({ id, messages, body }) => ({
					body: {
						...body,
						id,
						messages,
						model:
							modelRef.current === AUTO_MODEL ? undefined : modelRef.current,
					},
				}),
			}),
	);
	const urlIsSet = useRef(!isNew);
	const hasKey = models.length > 0;

	const chat = useChat<CoachUIMessage>({
		id,
		messages: initialMessages,
		transport,
		sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
		onFinish: () => {
			refreshChats();
			setTimeout(refreshChats, 3000);
		},
	});

	const { messages, status, sendMessage, clearError, addToolApprovalResponse } =
		chat;
	const busy = status === "submitted" || status === "streaming";
	const lastMessage = messages[messages.length - 1];
	const awaitingApproval =
		lastMessage?.role === "assistant" &&
		lastMessage.parts.some(
			(part) => isToolUIPart(part) && part.state === "approval-requested",
		);

	const send = (text: string) => {
		const trimmed = text.trim();
		if (!trimmed || busy || !hasKey) return;
		if (!urlIsSet.current) {
			window.history.replaceState(null, "", `/chat/${id}`);
			urlIsSet.current = true;
		}
		clearError();
		sendMessage({ text: trimmed, metadata: { createdAt: Date.now() } });
		setInput("");
	};

	const selectModel = (value: string) => {
		modelRef.current = value;
		setModel(value);
	};

	return {
		...chat,
		input,
		setInput,
		send,
		busy,
		awaitingApproval,
		lastMessage,
		hasKey,
		models,
		model,
		selectModel,
		approve: (approvalId: string, approved: boolean) =>
			addToolApprovalResponse({ id: approvalId, approved }),
	};
}
