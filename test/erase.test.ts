import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb } from "./db-test-utils";

let testDb: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
	testDb = await createTestDb();
});

afterAll(() => testDb.cleanup());

const count = (table: string) =>
	(
		testDb.sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get() as {
			n: number;
		}
	).n;

describe("erase all data", () => {
	it("empties every table but keeps the income group and migrations", async () => {
		const { eraseDatabase } = await import("@/lib/db/erase");
		const app = testDb.sqlite;
		app.exec(`
			INSERT INTO accounts (id, name) VALUES ('a1', 'Bank');
			INSERT INTO categories (id, name) VALUES ('c1', 'Food');
			INSERT INTO transactions (id, account_id, category_id, date, payment)
				VALUES ('t1', 'a1', 'c1', '2026-10-01', 1200);
			INSERT INTO app_settings (key, value) VALUES ('profile', '{}');
		`);

		eraseDatabase();

		expect(count("accounts")).toBe(0);
		expect(count("transactions")).toBe(0);
		expect(count("app_settings")).toBe(0);
		expect(count("categories WHERE name = 'Food'")).toBe(0);
		expect(count("category_group WHERE is_income = 1")).toBe(1);
		expect(count("__drizzle_migrations")).toBeGreaterThan(0);
		expect(() =>
			app.exec("DELETE FROM category_group WHERE is_income = 1"),
		).toThrow(/Income group cannot be deleted/);
	});
});
