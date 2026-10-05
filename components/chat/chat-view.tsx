"use client";

import { useChat } from "@ai-sdk/react";
import {
	DefaultChatTransport,
	isReasoningUIPart,
	isStaticToolUIPart,
	isTextUIPart,
	isToolUIPart,
	lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import { ArrowUp, KeyRound, RotateCcw, Sparkles, Square } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { modelLabel } from "@/lib/ai/labels";
import type { CoachUIMessage } from "@/lib/ai/message-types";
import { isWriteToolName } from "@/lib/ai/tool-names";
import { useChatShell } from "./chat-shell";
import Markdown from "./markdown";
import { ApprovalCard, ToolActivity } from "./tool-parts";

const SUGGESTIONS = [
	"How am I doing this month?",
	"Help me save for a new laptop",
	"Where can I cut back on spending?",
	"Am I on track for my goals?",
];

function errorText(error: Error): string {
	try {
		const parsed = JSON.parse(error.message) as { error?: string };
		if (parsed.error) return parsed.error;
	} catch {}
	return error.message || "Something went wrong.";
}

function AssistantMessage({
	message,
	isStreaming,
	onApprovalResponse,
}: {
	message: CoachUIMessage;
	isStreaming: boolean;
	onApprovalResponse: (id: string, approved: boolean) => void;
}) {
	return (
		<div className="flex flex-col gap-3">
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
					return (
						<details key={key} className="text-sm text-muted-foreground">
							<summary className="cursor-pointer select-none">
								{part.state === "streaming" ? "Thinking…" : "Thought process"}
							</summary>
							<p className="mt-1 whitespace-pre-wrap border-l-2 pl-3">
								{part.text}
							</p>
						</details>
					);
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
			{message.metadata?.model && !isStreaming && (
				<p className="text-xs text-muted-foreground">
					Answered by {modelLabel(message.metadata.model)}
				</p>
			)}
		</div>
	);
}

export default function ChatView({
	id,
	initialMessages,
	isNew,
	hasKey,
	hasProfile,
}: {
	id: string;
	initialMessages: CoachUIMessage[];
	isNew: boolean;
	hasKey: boolean;
	hasProfile: boolean;
}) {
	const { refreshChats } = useChatShell();
	const [input, setInput] = useState("");
	const urlIsSet = useRef(!isNew);
	const endRef = useRef<HTMLDivElement>(null);

	const {
		messages,
		sendMessage,
		status,
		stop,
		error,
		regenerate,
		clearError,
		addToolApprovalResponse,
	} = useChat<CoachUIMessage>({
		id,
		messages: initialMessages,
		transport: new DefaultChatTransport({ api: "/api/chat" }),
		sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
		onFinish: () => {
			refreshChats();
			setTimeout(refreshChats, 3000);
		},
	});

	const busy = status === "submitted" || status === "streaming";
	const lastMessage = messages[messages.length - 1];
	const awaitingApproval =
		lastMessage?.role === "assistant" &&
		lastMessage.parts.some(
			(part) => isToolUIPart(part) && part.state === "approval-requested",
		);

	const scrollKey = `${messages.length}:${lastMessage?.parts.length ?? 0}:${status}`;
	useEffect(() => {
		if (scrollKey) endRef.current?.scrollIntoView({ block: "end" });
	}, [scrollKey]);

	const send = (text: string) => {
		const trimmed = text.trim();
		if (!trimmed || busy || !hasKey) return;
		if (!urlIsSet.current) {
			window.history.replaceState(null, "", `/chat/${id}`);
			urlIsSet.current = true;
		}
		clearError();
		sendMessage({ text: trimmed });
		setInput("");
	};

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="min-h-0 flex-1 overflow-y-auto">
				<div className="mx-auto flex max-w-3xl flex-col gap-6 px-2 py-4">
					{messages.length === 0 && (
						<div className="flex flex-col items-center gap-4 py-16 text-center">
							<Sparkles className="h-10 w-10 text-muted-foreground" />
							<div>
								<h1 className="text-xl font-semibold">Your money coach</h1>
								<p className="text-sm text-muted-foreground">
									Talk through your budget, spending, or how to save for
									something. It can see your accounts, budget and goals.
								</p>
							</div>
							{hasKey && (
								<div className="flex flex-wrap justify-center gap-2">
									{SUGGESTIONS.map((suggestion) => (
										<Button
											key={suggestion}
											variant="outline"
											size="sm"
											onClick={() => send(suggestion)}
										>
											{suggestion}
										</Button>
									))}
								</div>
							)}
							{hasKey && !hasProfile && (
								<Link
									href="/settings"
									className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
								>
									Tell the coach about yourself for more personal advice
								</Link>
							)}
							{!hasKey && (
								<Button asChild>
									<Link href="/settings">
										<KeyRound /> Add a Groq or Gemini key in Settings
									</Link>
								</Button>
							)}
						</div>
					)}

					{messages.map((message, index) =>
						message.role === "user" ? (
							<div
								key={message.id}
								className="ml-auto max-w-[80%] whitespace-pre-wrap rounded-2xl bg-muted px-4 py-2"
							>
								{message.parts
									.filter(isTextUIPart)
									.map((part) => part.text)
									.join("\n")}
							</div>
						) : (
							<AssistantMessage
								key={message.id}
								message={message}
								isStreaming={busy && index === messages.length - 1}
								onApprovalResponse={(approvalId, approved) =>
									addToolApprovalResponse({ id: approvalId, approved })
								}
							/>
						),
					)}

					{status === "submitted" && lastMessage?.role === "user" && (
						<p className="animate-pulse text-sm text-muted-foreground">
							Thinking…
						</p>
					)}

					{error && (
						<div className="flex items-center gap-3 rounded-lg border border-destructive/40 p-3 text-sm">
							<span className="flex-1 text-destructive">
								{errorText(error)}
							</span>
							<Button size="sm" variant="outline" onClick={() => regenerate()}>
								<RotateCcw /> Retry
							</Button>
						</div>
					)}
					<div ref={endRef} />
				</div>
			</div>

			<form
				className="mx-auto w-full max-w-3xl px-2 pt-2"
				onSubmit={(event) => {
					event.preventDefault();
					send(input);
				}}
			>
				<div className="flex items-end gap-2 rounded-2xl border bg-card p-2">
					<Textarea
						value={input}
						onChange={(event) => setInput(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter" && !event.shiftKey) {
								event.preventDefault();
								send(input);
							}
						}}
						placeholder={
							!hasKey
								? "Add an API key in Settings to start"
								: awaitingApproval
									? "Confirm or cancel the change above first"
									: "Ask about your budget or a savings plan…"
						}
						disabled={!hasKey || awaitingApproval}
						rows={1}
						className="max-h-40 min-h-9 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
					/>
					{busy ? (
						<Button
							type="button"
							size="icon"
							variant="outline"
							onClick={() => stop()}
							aria-label="Stop"
						>
							<Square />
						</Button>
					) : (
						<Button
							type="submit"
							size="icon"
							disabled={!input.trim() || !hasKey || awaitingApproval}
							aria-label="Send"
						>
							<ArrowUp />
						</Button>
					)}
				</div>
				<p className="py-2 text-center text-xs text-muted-foreground">
					Your finance data is sent to Groq (or Google if Groq is unavailable)
					to answer. Not financial advice.
				</p>
			</form>
		</div>
	);
}
