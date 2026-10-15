import { MockLanguageModelV4 } from "ai/test";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type { ResolvedModel } from "@/lib/ai/models";
import { FIXTURES } from "@/lib/bank-parsers/fixtures";
import { createTestDb } from "./db-test-utils";

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/headers", () => ({
	cookies: async () => ({
		get: () => undefined,
		set: () => {},
		delete: () => {},
	}),
}));
vi.mock("@/lib/gmail", async (importOriginal) => {
	const original = await importOriginal<typeof import("@/lib/gmail")>();
	return {
		...original,
		fetchEmailsFromSender: async () => ({
			emails: [],
			historyId: "1",
			incomplete: false,
		}),
	};
});

let mockModels: ResolvedModel[] = [];
vi.mock("@/lib/ai/models", async (importOriginal) => {
	const original = await importOriginal<typeof import("@/lib/ai/models")>();
	return { ...original, availableModels: () => mockModels };
});

let ctx: Awaited<ReturnType<typeof createTestDb>>;
let refine: typeof import("@/app/actions/bank/ai-refine");
let sync: typeof import("@/app/actions/bank/sync");
let senders: typeof import("@/lib/mail/bank-sender-config");

const usage = {
	inputTokens: {
		total: 1,
		noCache: 1,
		cacheRead: undefined,
		cacheWrite: undefined,
	},
	outputTokens: { total: 1, text: 1, reasoning: undefined },
};

const fixture = FIXTURES.find((f) => f.name === "meezan: RAAST transfer out");
if (!fixture) throw new Error("missing meezan fixture");
const SENDER = "no-reply@meezanbank.com";
const MESSAGE_ID = "msg-1";

const aiReply = (value: object) =>
	new MockLanguageModelV4({
		doGenerate: async () => ({
			content: [{ type: "text", text: JSON.stringify(value) }],
			finishReason: { unified: "stop", raw: undefined },
			usage,
			warnings: [],
		}),
	});

const useModel = (model: MockLanguageModelV4) => {
	mockModels = [
		{ provider: "groq", model: "test-model", languageModel: model },
	];
};

const onlyTransaction = () => {
	const rows = ctx.db.select().from(ctx.schema.transactions).all();
	expect(rows).toHaveLength(1);
	return rows[0];
};

beforeAll(async () => {
	ctx = await createTestDb();
	refine = await import("@/app/actions/bank/ai-refine");
	sync = await import("@/app/actions/bank/sync");
	senders = await import("@/lib/mail/bank-sender-config");
});

afterAll(() => ctx.cleanup());

beforeEach(() => {
	process.env.GMAIL_ACCESS_TOKEN = "test-token";
	ctx.db.delete(ctx.schema.transactions).run();
	ctx.db.delete(ctx.schema.gmail_messages).run();
	ctx.db.delete(ctx.schema.gmail_sync_state).run();
	ctx.db.delete(ctx.schema.bank_sender_configs).run();
	ctx.db.delete(ctx.schema.accounts).run();

	senders.addBankSenderConfig(SENDER, "Meezan");
	ctx.db
		.insert(ctx.schema.gmail_messages)
		.values({
			id: MESSAGE_ID,
			from: fixture.email.from,
			body_text: fixture.email.body,
		})
		.run();
	mockModels = [];
});

// The regex pass runs as part of a sync, so these tests drive the real sync.
const regexImport = () => sync.syncBankTransactions();

describe("AI refine pass", () => {
	it("overwrites a pending regex row with the AI reading", async () => {
		await regexImport();
		expect(onlyTransaction().notes).toBe("J.SPORTS");

		useModel(
			aiReply({
				isTransaction: true,
				amount: 650,
				date: "2026-09-14",
				type: "expense",
				counterparty: "Jhelum Sports",
			}),
		);
		await expect(refine.refineBankTransactionsWithAi()).resolves.toEqual({
			refined: 1,
			skipped: false,
		});

		const tx = onlyTransaction();
		expect(tx.payment).toBe(65000);
		expect(tx.date).toBe("2026-09-14");
		expect(tx.notes).toBe("Jhelum Sports");
		expect(tx.status).toBe("pending");
	});

	it("only renames an accepted row", async () => {
		await regexImport();
		ctx.db.update(ctx.schema.transactions).set({ status: "cleared" }).run();

		useModel(
			aiReply({
				isTransaction: true,
				amount: 650,
				date: "2026-09-14",
				type: "expense",
				counterparty: "Jhelum Sports",
			}),
		);
		await refine.refineBankTransactionsWithAi();

		const tx = onlyTransaction();
		expect(tx.payment).toBe(64000);
		expect(tx.date).toBe("2026-09-13");
		expect(tx.notes).toBe("Jhelum Sports");
	});

	it("caches the answer so a second run makes no model call", async () => {
		await regexImport();
		const model = aiReply({
			isTransaction: true,
			amount: 640,
			date: "2026-09-13",
			type: "expense",
			counterparty: "Jhelum Sports",
		});
		const doGenerate = vi.spyOn(model, "doGenerate");
		useModel(model);

		await refine.refineBankTransactionsWithAi();
		expect(doGenerate).toHaveBeenCalledTimes(1);

		await expect(refine.refineBankTransactionsWithAi()).resolves.toEqual({
			refined: 0,
			skipped: false,
		});
		expect(doGenerate).toHaveBeenCalledTimes(1);
	});

	it("keeps the AI name when the regex import runs again", async () => {
		await regexImport();
		useModel(
			aiReply({
				isTransaction: true,
				amount: 650,
				date: "2026-09-14",
				type: "expense",
				counterparty: "Jhelum Sports",
			}),
		);
		await refine.refineBankTransactionsWithAi();

		await regexImport();

		const tx = onlyTransaction();
		expect(tx.notes).toBe("Jhelum Sports");
		expect(tx.payment).toBe(65000);
	});

	it("leaves the regex row alone when the AI says it is not a transaction", async () => {
		await regexImport();
		useModel(
			aiReply({
				isTransaction: false,
				amount: null,
				date: null,
				type: null,
				counterparty: null,
			}),
		);
		await refine.refineBankTransactionsWithAi();

		const tx = onlyTransaction();
		expect(tx.notes).toBe("J.SPORTS");
		expect(tx.payment).toBe(64000);
	});

	it("skips quietly when no AI key is configured", async () => {
		mockModels = [];
		await expect(refine.refineBankTransactionsWithAi()).resolves.toEqual({
			refined: 0,
			skipped: true,
		});
	});
});
