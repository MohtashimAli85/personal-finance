import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb } from "./db-test-utils";

let testDb: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
	testDb = await createTestDb();
	testDb.sqlite.exec(`
		INSERT INTO accounts (id, name, created_at) VALUES
			('first', 'First', '2026-01-01'),
			('recent', 'Recent', '2026-01-02'),
			('closed', 'Closed', '2026-01-03');
		UPDATE accounts SET closed_at = '2026-10-01' WHERE id = 'closed';
		INSERT INTO transactions (id, account_id, date) VALUES
			('t1', 'first', '2026-10-05'),
			('t2', 'recent', '2026-10-05'),
			('t3', 'closed', '2026-10-09');
	`);
});

afterAll(() => testDb.cleanup());

describe("getDefaultAccountId", () => {
	it("picks the open account used most recently", async () => {
		const { getDefaultAccountId } = await import("@/lib/account");
		expect(getDefaultAccountId()).toBe("recent");
	});
});
