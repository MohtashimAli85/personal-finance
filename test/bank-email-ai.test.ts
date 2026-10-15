import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { extractWithAi } from "@/lib/bank-parsers/ai";
import type { BankEmail } from "@/lib/bank-parsers/types";

const usage = {
	inputTokens: {
		total: 1,
		noCache: 1,
		cacheRead: undefined,
		cacheWrite: undefined,
	},
	outputTokens: { total: 1, text: 1, reasoning: undefined },
};

const modelReplying = (value: object) =>
	new MockLanguageModelV4({
		doGenerate: async () => ({
			content: [{ type: "text", text: JSON.stringify(value) }],
			finishReason: { unified: "stop", raw: undefined },
			usage,
			warnings: [],
		}),
	});

const email: BankEmail = {
	from: "Meezan Bank <no-reply@meezanbank.com>",
	subject: "Transaction alert",
	body: "PKR 640.00 sent from your account xxx0417 to J.SPORTS",
	receivedAt: "2026-09-13T12:00:00.000Z",
};

describe("extractWithAi", () => {
	it("maps a completed transaction onto the parsed shape", async () => {
		const model = modelReplying({
			isTransaction: true,
			amount: 640,
			date: "2026-09-12",
			type: "expense",
			counterparty: "  J. Sports  ",
		});

		await expect(extractWithAi(email, model)).resolves.toEqual({
			amount: 640,
			date: "2026-09-12T12:00:00.000Z",
			type: "expense",
			description: "J. Sports",
		});
	});

	it("returns null when the email is not a transaction", async () => {
		const model = modelReplying({
			isTransaction: false,
			amount: null,
			date: null,
			type: null,
			counterparty: null,
		});

		await expect(extractWithAi(email, model)).resolves.toBeNull();
	});

	it("dates the transaction from the email when no date is given", async () => {
		const model = modelReplying({
			isTransaction: true,
			amount: 640,
			date: null,
			type: "income",
			counterparty: "Ali",
		});

		const result = await extractWithAi(email, model);
		expect(result?.date).toBe("2026-09-13T12:00:00.000Z");
		expect(result?.type).toBe("income");
	});

	it("falls back to a generic description when there is no counterparty", async () => {
		const model = modelReplying({
			isTransaction: true,
			amount: 10,
			date: "2026-09-13",
			type: "expense",
			counterparty: "  ",
		});

		const result = await extractWithAi(email, model);
		expect(result?.description).toBe("Bank Transaction");
	});

	it("returns null for a zero or missing amount", async () => {
		const model = modelReplying({
			isTransaction: true,
			amount: null,
			date: "2026-09-13",
			type: "expense",
			counterparty: "Shop",
		});

		await expect(extractWithAi(email, model)).resolves.toBeNull();
	});
});
