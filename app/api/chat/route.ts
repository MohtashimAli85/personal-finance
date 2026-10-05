import {
	convertToModelMessages,
	createIdGenerator,
	createUIMessageStreamResponse,
	isStepCount,
	streamText,
	toUIMessageStream,
	validateUIMessages,
} from "ai";
import { NextResponse } from "next/server";
import { toolApprovalSecret, writeToolApproval } from "@/lib/ai/approval";
import { createFallbackModel, describeChatError } from "@/lib/ai/fallback";
import {
	type CoachUIMessage,
	coachMetadataSchema,
} from "@/lib/ai/message-types";
import { availableModels, type ResolvedModel } from "@/lib/ai/models";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { generateChatTitle } from "@/lib/ai/title";
import { financeTools } from "@/lib/ai/tools";
import { CHAT_ID_RE, ensureChat, getChat, saveChatMessages } from "@/lib/chat";

const MAX_HISTORY_MESSAGES = 20;

const badRequest = (error: string, status = 400) =>
	NextResponse.json({ error }, { status });

function recentHistory(messages: CoachUIMessage[]): CoachUIMessage[] {
	const recent = messages.slice(-MAX_HISTORY_MESSAGES);
	const firstUser = recent.findIndex((message) => message.role === "user");
	return firstUser > 0 ? recent.slice(firstUser) : recent;
}

export async function POST(request: Request) {
	const body = (await request.json().catch(() => null)) as {
		id?: unknown;
		messages?: unknown;
	} | null;
	const chatId = typeof body?.id === "string" ? body.id : "";
	if (!CHAT_ID_RE.test(chatId)) return badRequest("Invalid chat id.");
	if (!Array.isArray(body?.messages) || body.messages.length === 0) {
		return badRequest("No messages to send.");
	}

	const models = availableModels();
	if (models.length === 0) {
		return badRequest(
			"Add a Groq or Gemini API key in Settings to use the AI coach.",
			412,
		);
	}

	let messages: CoachUIMessage[];
	try {
		messages = await validateUIMessages<CoachUIMessage>({
			messages: body.messages,
			tools: financeTools,
			metadataSchema: coachMetadataSchema.optional(),
		});
	} catch {
		return badRequest("The conversation could not be read.");
	}

	ensureChat(chatId);
	saveChatMessages(chatId, messages);
	if (!getChat(chatId)?.title) {
		void generateChatTitle(chatId, messages, models);
	}

	let usedModel: ResolvedModel | undefined;
	const model = createFallbackModel(models, (entry) => {
		usedModel = entry;
	});

	const result = streamText({
		model,
		instructions: buildSystemPrompt(),
		messages: await convertToModelMessages(recentHistory(messages), {
			tools: financeTools,
			ignoreIncompleteToolCalls: true,
		}),
		tools: financeTools,
		toolApproval: writeToolApproval(),
		experimental_toolApprovalSecret: toolApprovalSecret(),
		stopWhen: isStepCount(6),
		reasoning: "medium",
		maxRetries: 0,
		abortSignal: request.signal,
	});

	return createUIMessageStreamResponse({
		stream: toUIMessageStream<typeof financeTools, CoachUIMessage>({
			stream: result.stream,
			tools: financeTools,
			originalMessages: messages,
			generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
			messageMetadata: ({ part }) => {
				if (part.type === "start") return { createdAt: Date.now() };
				if (part.type === "finish" && usedModel) {
					return { model: usedModel.model };
				}
				return undefined;
			},
			onError: describeChatError,
			onEnd: ({ messages: finalMessages }) => {
				saveChatMessages(chatId, finalMessages, { onlyIfCurrent: true });
			},
		}),
	});
}
