import { APICallError, RetryError } from "ai";
import { describe, expect, it } from "vitest";
import { describeAiError, isKeyRejected } from "@/lib/ai/errors";
import { modelLabel } from "@/lib/ai/models";

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
