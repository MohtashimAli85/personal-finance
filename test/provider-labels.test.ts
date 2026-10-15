import { describe, expect, it } from "vitest";
import { PROVIDER_LABELS } from "@/lib/ai/labels";

describe("provider labels", () => {
	it("names every provider", () => {
		expect(PROVIDER_LABELS).toEqual({
			groq: "Groq",
			gemini: "Gemini",
			anthropic: "Claude",
			openai: "OpenAI",
		});
	});
});
