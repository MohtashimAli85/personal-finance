import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb } from "./db-test-utils";

vi.mock("next/cache", () => ({ revalidatePath: () => {}, refresh: () => {} }));

let ctx: Awaited<ReturnType<typeof createTestDb>>;
let accountId: string;

beforeAll(async () => {
	ctx = await createTestDb();
	accountId = ctx.makeAccount();
	const rows = [
		{ notes: "a", date: "2026-03-01", payment: 300 },
		{ notes: "b", date: "2026-03-02", deposit: 900 },
		{ notes: "c", date: "2026-03-03", payment: 100 },
		{ notes: "d", date: "2026-03-04", payment: 300 },
	];
	for (const row of rows) {
		ctx.db
			.insert(ctx.schema.transactions)
			.values({ id: randomUUID(), account_id: accountId, ...row })
			.run();
	}
});

async function order(params: SearchParams) {
	const { getTransactions } = await import("@/lib/transaction");
	return getTransactions({ accountId, ...params })
		.data.map((row) => row.notes)
		.join("");
}

describe("transaction sorting", () => {
	it("defaults to newest first, also for an unknown column", async () => {
		expect(await order({})).toBe("dcba");
		expect(await order({ sort: "notes; drop table", dir: "asc" })).toBe("dcba");
	});

	it("sorts by date both ways", async () => {
		expect(await order({ sort: "date", dir: "asc" })).toBe("abcd");
		expect(await order({ sort: "date", dir: "desc" })).toBe("dcba");
	});

	it("sorts amounts with blanks last and newest first among ties", async () => {
		expect(await order({ sort: "payment", dir: "desc" })).toBe("dacb");
		expect(await order({ sort: "payment", dir: "asc" })).toBe("cdab");
		expect(await order({ sort: "deposit", dir: "desc" })).toBe("bdca");
	});

	it("keeps paging under a sort", async () => {
		const { getTransactions } = await import("@/lib/transaction");
		const page = getTransactions({ accountId, sort: "payment", limit: "2" });
		expect(page.data.map((row) => row.notes)).toEqual(["d", "a"]);
		expect(page.hasMore).toBe(true);
	});
});
