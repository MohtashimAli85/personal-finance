import { generateText } from "ai";
import { setChatTitle } from "@/lib/chat";
import { createFallbackModel } from "./fallback";
import type { CoachUIMessage } from "./message-types";
import type { ResolvedModel } from "./models";

const firstUserText = (messages: CoachUIMessage[]) =>
	messages
		.find((message) => message.role === "user")
		?.parts.flatMap((part) => (part.type === "text" ? [part.text] : []))
		.join(" ")
		.trim() ?? "";

const truncate = (text: string, max: number) =>
	text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

export async function generateChatTitle(
	chatId: string,
	messages: CoachUIMessage[],
	models: ResolvedModel[],
) {
	const opening = firstUserText(messages);
	if (!opening) return;
	setChatTitle(chatId, truncate(opening, 60));

	const cheapestFirst = [...models].sort(
		(a, b) => Number(b.model.includes("20b")) - Number(a.model.includes("20b")),
	);
	try {
		const { text } = await generateText({
			model: createFallbackModel(cheapestFirst),
			instructions:
				"Write a 2-6 word title for a personal finance chat that starts with the user's message below. Reply with the title only, no quotes or punctuation at the end.",
			prompt: truncate(opening, 500),
			reasoning: "low",
			maxRetries: 0,
			abortSignal: AbortSignal.timeout(15_000),
		});
		const title = text.replace(/^["'\s]+|["'.\s]+$/g, "").split("\n")[0];
		if (title) setChatTitle(chatId, truncate(title, 60));
	} catch (error) {
		console.error("[ai] title generation failed:", error);
	}
}
