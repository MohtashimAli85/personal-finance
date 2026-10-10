import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb } from "./db-test-utils";
import { buildZip } from "./zip-fixture";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-actual-"));
const sourcePath = path.join(dir, "actual.sqlite");
const targetPath = path.join(dir, "app.sqlite");

afterAll(() => {
	testDb.cleanup();
	fs.rmSync(dir, { recursive: true, force: true });
});

function buildActualExport() {
	const db = new Database(sourcePath);
	db.exec(`
		CREATE TABLE accounts (id TEXT PRIMARY KEY, name TEXT, offbudget INTEGER, closed INTEGER, tombstone INTEGER, sort_order REAL);
		CREATE TABLE category_groups (id TEXT PRIMARY KEY, name TEXT, is_income INTEGER, sort_order REAL, tombstone INTEGER, hidden INTEGER);
		CREATE TABLE categories (id TEXT PRIMARY KEY, name TEXT, cat_group TEXT, sort_order REAL, tombstone INTEGER, hidden INTEGER);
		CREATE TABLE category_mapping (id TEXT PRIMARY KEY, transferId TEXT);
		CREATE TABLE payees (id TEXT PRIMARY KEY, name TEXT, tombstone INTEGER);
		CREATE TABLE transactions (id TEXT PRIMARY KEY, acct TEXT, category TEXT, amount INTEGER, description TEXT, notes TEXT,
			imported_description TEXT, date INTEGER, pending INTEGER, tombstone INTEGER, isParent INTEGER, isChild INTEGER,
			transferred_id TEXT, sort_order REAL);
		CREATE VIEW v_transactions_internal_alive AS
			SELECT t.id, t.isParent AS is_parent, t.isChild AS is_child, t.acct AS account, cm.transferId AS category,
				t.amount, t.description AS payee, t.notes, t.imported_description AS imported_payee, t.date,
				t.transferred_id AS transfer_id, t.sort_order
			FROM transactions t LEFT JOIN category_mapping cm ON cm.id = t.category
			WHERE t.tombstone = 0;
		CREATE TABLE zero_budgets (id TEXT PRIMARY KEY, month INTEGER, category TEXT, amount INTEGER, carryover INTEGER);
		CREATE TABLE zero_budget_months (id TEXT PRIMARY KEY, buffered INTEGER);

		INSERT INTO accounts VALUES ('acc', 'Bank', 0, 0, 0, 1), ('off', 'Savings', 1, 0, 0, 2);
		INSERT INTO category_groups VALUES ('inc', 'Income', 1, 9, 0, 0), ('food', 'Food', 0, 1, 0, 0);
		INSERT INTO categories VALUES
			('salary', 'Salary', 'inc', 1, 0, 0),
			('groc', 'Groceries', 'food', 1, 0, 0),
			('old', 'Old Groceries', 'food', 2, 1, 0),
			('secret', 'Secret', 'food', 3, 0, 1);
		INSERT INTO category_mapping VALUES ('salary','salary'), ('groc','groc'), ('old','groc'), ('secret','secret');
		INSERT INTO payees VALUES ('p1', 'Store', 0);
		INSERT INTO transactions VALUES
			('t1', 'acc', 'salary', 100000, NULL, NULL, NULL, 20260901, 0, 0, 0, 0, NULL, 1),
			('t2', 'acc', 'old', -30000, 'p1', 'veg', NULL, 20260905, 0, 0, 0, 0, NULL, 2),
			('t3', 'acc', 'secret', -5000, NULL, NULL, NULL, 20260906, 0, 0, 0, 0, NULL, 3),
			('t4', 'acc', NULL, -10000, NULL, NULL, NULL, 20260907, 0, 0, 0, 0, 't5', 4),
			('t5', 'off', NULL, 10000, NULL, NULL, NULL, 20260907, 0, 0, 0, 0, 't4', 5);
		INSERT INTO zero_budgets VALUES
			('b1', 202609, 'groc', 40000, 1),
			('b2', 202609, 'secret', 5000, 0);
		INSERT INTO zero_budget_months VALUES ('202609', 10000);
	`);
	db.close();
}

let exportBytes: Buffer;
let zipBytes: Buffer;
let testDb: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
	testDb = await createTestDb();
	buildActualExport();
	exportBytes = fs.readFileSync(sourcePath);
	zipBytes = buildZip([
		{ name: "metadata.json", data: Buffer.from("{}") },
		{ name: "db.sqlite", data: exportBytes, deflate: true },
	]);
});

describe("loadActualData", () => {
	it("reads a zip and a bare db.sqlite alike", async () => {
		const { loadActualData } = await import("@/lib/actual-import");
		const fromZip = loadActualData(zipBytes);
		expect(fromZip).toEqual(loadActualData(exportBytes));
		expect(fromZip.accounts).toHaveLength(2);
		expect(fromZip.transactions).toHaveLength(5);
	});

	it("rejects files that are not an Actual export", async () => {
		const { loadActualData, ActualImportError } = await import(
			"@/lib/actual-import"
		);
		const other = path.join(dir, "other.sqlite");
		const db = new Database(other);
		db.exec("CREATE TABLE accounts (id TEXT)");
		db.close();
		const inputs = [
			Buffer.from("date,amount\n2026-01-01,5"),
			buildZip([{ name: "notes.txt", data: Buffer.from("hi") }]),
			zipBytes.subarray(0, 40),
			fs.readFileSync(other),
		];
		for (const input of inputs) {
			expect(() => loadActualData(input)).toThrow(ActualImportError);
		}
	});
});

describe("applyActualImport", () => {
	it("imports Actual's data, then keeps app-only goals on re-import", async () => {
		const { loadActualData, previewActualImport, applyActualImport } =
			await import("@/lib/actual-import");
		const data = loadActualData(zipBytes);
		const app = testDb.sqlite;
		expect(previewActualImport(app, data)).toMatchObject({
			accounts: 2,
			categories: 3,
			transactions: 5,
			budgets: 2,
			holds: 1,
			goals: [],
		});
		applyActualImport(app, data);

		const groceries = app
			.prepare("select id, hidden from categories where name = 'Groceries'")
			.get() as { id: string; hidden: number };
		expect(
			app
				.prepare("select count(*) as n from transactions where category_id = ?")
				.get(groceries.id),
		).toEqual({ n: 1 });
		expect(
			app.prepare("select hidden from categories where name = 'Secret'").get(),
		).toEqual({ hidden: 1 });
		expect(
			app
				.prepare(
					"select notes, transfer_id from transactions where id = 't2' or id = 't4' order by id",
				)
				.all(),
		).toEqual([
			{ notes: "Store - veg", transfer_id: null },
			{ notes: null, transfer_id: "t4:t5" },
		]);
		expect(
			app.prepare("select balance from accounts where id = 'acc'").get(),
		).toEqual({ balance: 55000 });
		expect(
			app
				.prepare(
					"select amount, carryover from monthly_budgets where category_id = ?",
				)
				.get(groceries.id),
		).toEqual({ amount: 40000, carryover: 1 });
		expect(
			app.prepare("select month, buffered from budget_months").all(),
		).toEqual([{ month: "2026-09", buffered: 10000 }]);
		expect(() =>
			app.prepare("delete from category_group where is_income = 1").run(),
		).toThrow(/Income group cannot be deleted/);

		app
			.prepare(
				"insert into category_group (id, name, sort_order) values ('goals-group', 'Savings Goals', 5)",
			)
			.run();
		app
			.prepare(
				"insert into categories (id, name, group_id) values ('pc', 'PC', 'goals-group')",
			)
			.run();
		app
			.prepare(
				"insert into monthly_budgets (category_id, month, amount) values ('pc', '2026-10', 20000)",
			)
			.run();
		app
			.prepare(
				"insert into goals (id, name, target_amount, target_month, category_id) values ('g1', 'PC', 400000, '2028-04', 'pc')",
			)
			.run();

		expect(previewActualImport(app, data).goals).toEqual([
			{ name: "PC", category: "PC" },
		]);
		applyActualImport(app, data);

		expect(
			app
				.prepare(
					`select g.name, g.target_amount, g.target_month, c.name as category, cg.name as grp,
						(select amount from monthly_budgets b where b.category_id = c.id and b.month = '2026-10') as budget
					from goals g join categories c on c.id = g.category_id join category_group cg on cg.id = c.group_id`,
				)
				.get(),
		).toEqual({
			name: "PC",
			target_amount: 400000,
			target_month: "2028-04",
			category: "PC",
			grp: "Savings Goals",
			budget: 20000,
		});
		expect(app.prepare("select count(*) as n from transactions").get()).toEqual(
			{ n: 5 },
		);
	});
});

describe("backupDatabase", () => {
	it("writes a restorable copy into the backups folder", async () => {
		const { backupDatabase } = await import("@/lib/db/backup");
		const sqlite = testDb.sqlite;
		const file = backupDatabase(sqlite, path.join(dir, "backups"), "test");
		expect(path.basename(file)).toMatch(/^db-before-test-\d{8}-\d{6}\.sqlite$/);
		const copy = new Database(file, { readonly: true });
		expect(
			copy.prepare("select name from accounts order by name").all(),
		).toEqual([{ name: "Bank" }, { name: "Savings" }]);
		copy.close();
	});
});

describe("scripts/import-actual-db.ts", () => {
	it("imports a zip and backs up the target first", () => {
		const zipPath = path.join(dir, "export.zip");
		fs.writeFileSync(zipPath, zipBytes);
		const stdout = execFileSync(
			"pnpm",
			["tsx", "scripts/import-actual-db.ts", zipPath],
			{ env: { ...process.env, APP_DB_PATH: targetPath }, encoding: "utf8" },
		);
		const output = JSON.parse(stdout.slice(stdout.indexOf("{")));
		expect(output.transactions).toBe(5);
		expect(fs.existsSync(output.backupPath)).toBe(true);
	});
});
