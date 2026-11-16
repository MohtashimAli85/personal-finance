import { APICallError, RetryError } from "ai";
import { describe, expect, it } from "vitest";
import { describeAiError, isKeyRejected } from "@/lib/ai/errors";
import { modelLabel } from "@/lib/ai/labels";

const apiError = (statusCode: number) =>
	new APICallError({
		message: "failed",
		url: "https://example.test",
		requestBodyValues: {},
		statusCode,
	});

describe("modelLabel", () => {
	it("labels known models", () => {
		expect(modelLabel("openai/gpt-oss-120b")).toBe("GPT-OSS 120B (Groq)");
		expect(modelLabel("openai/gpt-oss-20b")).toBe("GPT-OSS 20B (Groq)");
		expect(modelLabel("gemini-3.5-flash")).toBe("Gemini 3.5 Flash");
		expect(modelLabel("gemini-3.5-flash-lite")).toBe("Gemini 3.5 Flash Lite");
		expect(modelLabel("claude-haiku-5-5")).toBe("Claude Haiku 5.5");
		expect(modelLabel("gpt-5.4-nano")).toBe("GPT-5.4 Nano (OpenAI)");
		expect(modelLabel("something-else")).toBe("something-else");
	});
});

describe("describeAiError", () => {
	it("names the provider that failed", () => {
		expect(describeAiError(apiError(401), "groq")).toMatch(/^Groq rejected/);
		expect(describeAiError(apiError(403), "gemini")).toMatch(
			/^Gemini rejected/,
		);
	});

	it("says where a rejected key comes from and how to fix it", () => {
		expect(describeAiError(apiError(401), "groq", { source: "env" })).toBe(
			"Groq rejected the key in GROQ_API_KEY. Update it in your .env file and restart the app.",
		);
		expect(
			describeAiError(apiError(401), "groq", {
				source: "env",
				inSettings: true,
			}),
		).toMatch(/isn't used while that variable is set/);
		expect(describeAiError(apiError(403), "gemini", { source: "stored" })).toBe(
			"Gemini rejected your saved API key. Replace it in Settings.",
		);
		expect(
			describeAiError(apiError(401), "gemini", {
				source: "stored",
				inSettings: true,
			}),
		).toMatch(/Paste a new key above/);
	});

	it("classifies rate limits and outages", () => {
		expect(describeAiError(apiError(429), "groq")).toMatch(/rate limit/);
		expect(describeAiError(apiError(503), "groq")).toMatch(/busy or down/);
	});

	it("unwraps retry errors", () => {
		const retry = new RetryError({
			message: "retries exhausted",
			reason: "maxRetriesExceeded",
			errors: [apiError(429)],
		});
		expect(describeAiError(retry, "groq")).toMatch(/rate limit/);
		expect(isKeyRejected(retry)).toBe(false);
		expect(isKeyRejected(apiError(401))).toBe(true);
	});

	it("detects network failures", () => {
		const error = new TypeError("fetch failed", {
			cause: Object.assign(new Error("getaddrinfo"), { code: "ENOTFOUND" }),
		});
		expect(describeAiError(error, "groq")).toMatch(/internet connection/);
	});
});
