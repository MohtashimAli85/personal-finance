import { isTextUIPart } from "ai";
import type { CoachUIMessage } from "@/lib/ai/message-types";

export const messageText = (message: CoachUIMessage) =>
	message.parts
		.filter(isTextUIPart)
		.map((part) => part.text)
		.join("\n");
