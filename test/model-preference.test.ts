import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { availableModels, MODEL_CHAIN } from "@/lib/ai/models";

describe("availableModels preferred model", () => {
	const saved = {
		groq: process.env.GROQ_API_KEY,
		gemini: process.env.GEMINI_API_KEY,
	};

	beforeEach(() => {
		process.env.GROQ_API_KEY = "test-groq";
		process.env.GEMINI_API_KEY = "test-gemini";
	});

	afterEach(() => {
		process.env.GROQ_API_KEY = saved.groq;
		process.env.GEMINI_API_KEY = saved.gemini;
		if (saved.groq === undefined) delete process.env.GROQ_API_KEY;
		if (saved.gemini === undefined) delete process.env.GEMINI_API_KEY;
	});

	it("keeps the chain order when no model is preferred", () => {
		const order = availableModels(MODEL_CHAIN).map((entry) => entry.model);
		expect(order[0]).toBe("openai/gpt-oss-120b");
	});

	it("moves the preferred model to the front and keeps the rest as fallbacks", () => {
		const order = availableModels(MODEL_CHAIN, "gemini-3.5-flash").map(
			(entry) => entry.model,
		);
		expect(order[0]).toBe("gemini-3.5-flash");
		expect(order).toHaveLength(4);
		expect(order).toContain("openai/gpt-oss-120b");
	});

	it("ignores a preferred model that is not in the chain", () => {
		const order = availableModels(MODEL_CHAIN, "unknown-model").map(
			(entry) => entry.model,
		);
		expect(order[0]).toBe("openai/gpt-oss-120b");
	});
});
