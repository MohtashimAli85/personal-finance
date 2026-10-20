import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
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

describe("export and restore", () => {
	it("restores everything from an export, replacing current data", async () => {
		const { exportDatabase, restoreDatabase } = await import(
			"@/lib/db/restore"
		);
		const app = testDb.sqlite;
		app.exec(`
			INSERT INTO accounts (id, name) VALUES ('a1', 'Bank');
			INSERT INTO categories (id, name) VALUES ('c1', 'Food');
			INSERT INTO transactions (id, account_id, category_id, date, payment)
				VALUES ('t1', 'a1', 'c1', '2026-10-01', 1200);
		`);
		const exported = exportDatabase(app);

		app.exec(`
			DELETE FROM accounts;
			INSERT INTO accounts (id, name) VALUES ('a2', 'Other');
		`);
		expect(count("transactions")).toBe(0);

		restoreDatabase(app, exported);

		expect(app.prepare("SELECT id, name FROM accounts").all()).toEqual([
			{ id: "a1", name: "Bank" },
		]);
		expect(
			app.prepare("SELECT account_id, category_id FROM transactions").get(),
		).toEqual({ account_id: "a1", category_id: "c1" });
		expect(count("category_group WHERE is_income = 1")).toBe(1);
		expect(() =>
			app.exec("DELETE FROM category_group WHERE is_income = 1"),
		).toThrow(/Income group cannot be deleted/);
	});

	it("rejects files that are not an export, leaving data untouched", async () => {
		const { restoreDatabase, RestoreError } = await import("@/lib/db/restore");
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-restore-test-"));
		const other = path.join(dir, "other.sqlite");
		const db = new Database(other);
		db.exec("CREATE TABLE accounts (id TEXT)");
		db.close();
		const before = count("accounts");

		for (const input of [Buffer.from("not sqlite"), fs.readFileSync(other)]) {
			expect(() => restoreDatabase(testDb.sqlite, input)).toThrow(RestoreError);
		}
		expect(count("accounts")).toBe(before);
		fs.rmSync(dir, { recursive: true, force: true });
	});

	it("rejects an export from a newer app version", async () => {
		const { exportDatabase, restoreDatabase, RestoreError } = await import(
			"@/lib/db/restore"
		);
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-restore-test-"));
		const file = path.join(dir, "newer.sqlite");
		fs.writeFileSync(file, exportDatabase(testDb.sqlite));
		const db = new Database(file);
		db.exec(
			"INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('future', 99999999999999)",
		);
		db.close();

		expect(() => restoreDatabase(testDb.sqlite, fs.readFileSync(file))).toThrow(
			RestoreError,
		);
		fs.rmSync(dir, { recursive: true, force: true });
	});
});
