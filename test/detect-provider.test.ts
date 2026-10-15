import { describe, expect, it } from "vitest";
import { detectProvider } from "@/lib/ai/detect-provider";

describe("detectProvider", () => {
	it("recognises each provider by key prefix", () => {
		expect(detectProvider("sk-ant-api03-abcdefghijkl")).toBe("anthropic");
		expect(detectProvider("sk-proj-abcdefghijklmnop")).toBe("openai");
		expect(detectProvider("gsk_abcdefghijklmnopqrstu")).toBe("groq");
		expect(detectProvider("AIzaSyAbcdefghijklmnop")).toBe("gemini");
	});

	it("ignores surrounding whitespace", () => {
		expect(detectProvider("  gsk_abcdefghijklmnopqrstu \n")).toBe("groq");
	});

	it("returns null for an unknown key", () => {
		expect(detectProvider("hello-world-not-a-key")).toBeNull();
		expect(detectProvider("")).toBeNull();
	});
});
