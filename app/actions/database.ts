import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { format } from "date-fns";

const uid = () => crypto.randomUUID();

// NOTE: In Electron/packaged apps, use app.getPath('userData') instead of process.cwd()
const dbPath = path.join(process.cwd(), "db.sqlite");
const dbDir = path.dirname(dbPath);
// if (fs.existsSync(dbPath)) {
//   fs.unlinkSync(dbPath);
// }
// 1. Ensure directory exists (Critical for offline apps)
if (!fs.existsSync(dbDir)) {
	fs.mkdirSync(dbDir, { recursive: true });
}

// 2. Open DB (Auto-creates file)
const db = new Database(dbPath);

// 3. Essential Offline Pragmas
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON"); // <--- REQUIRED to enforce your schema constraints

// 4. Initialize Schema (Wrapped in a transaction for safety)
const initSchema = db.transaction(() => {
	// datetime is in utc having format "yyyy-MM-dd HH:mm:ss"
	db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      balance REAL DEFAULT 0,
      account_type TEXT NOT NULL DEFAULT 'on_budget',
	  created_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS category_group (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_income INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      group_id TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (group_id) REFERENCES category_group(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT,
      category_id TEXT,
      payment REAL,
      notes TEXT,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deposit REAL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS monthly_budgets (
      category_id TEXT NOT NULL,
      month TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (category_id, month),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    -- 5. Index for performance (Crucial for offline speed)
    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category_date ON transactions(category_id, date);
    CREATE INDEX IF NOT EXISTS idx_monthly_budgets_month_category ON monthly_budgets(month, category_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_category_group_single_income
      ON category_group(is_income)
      WHERE is_income = 1;
  `);
});

// 5. Populate default categories and groups
const populateDefaults = db.transaction(() => {
	// Check if data already exists
	const groupCount = db
		.prepare("SELECT COUNT(*) as count FROM category_group")
		.get() as { count: number };

	if (groupCount.count === 0) {
		// Define default groups and categories
		const defaults = [
			{
				group: "Usual Expenses",
				categories: ["Food", "General", "Bills", "Bills (Flexible)"],
			},
			{
				group: "Investments and Savings",
				categories: ["Savings"],
			},
			{
				group: "Income",
				categories: ["Income", "Starting Balances"],
			},
		];

		// Insert groups and categories
		const insertGroup = db.prepare(
			"INSERT INTO category_group (id, name, sort_order, is_income) VALUES (?, ?, ?, ?)",
		);
		const insertCategory = db.prepare(
			"INSERT INTO categories (id, name, group_id, sort_order) VALUES (?, ?, ?, ?)",
		);

		defaults.forEach(({ group, categories }, groupIndex) => {
			const isIncome = group.toLowerCase() === "income" ? 1 : 0;
			const groupId = uid();
			insertGroup.run(
				groupId,
				group,
				isIncome ? 9999 : groupIndex + 1,
				isIncome,
			);

			categories.forEach((category, categoryIndex) => {
				insertCategory.run(uid(), category, groupId, categoryIndex + 1);
			});
		});
	}
});
// 6. populate accounts
const populateAccounts = db.transaction(() => {
	const accountCount = db
		.prepare("SELECT COUNT(*) as count FROM accounts")
		.get() as { count: number };
	if (accountCount.count === 0) {
		const insertAccount = db.prepare(
			"INSERT INTO accounts (id, name, balance, created_at) VALUES (?, ?, ?, ?)",
		);
		const now = new Date(new Date().toUTCString());
		now.setHours(6); // Set to start of the day
		const sqliteUTC = (date: Date) => format(date, "yyyy-MM-dd HH:mm:ss");
		insertAccount.run(uid(), "Savings", 50000, sqliteUTC(now));
		now.setHours(7);
		insertAccount.run(uid(), "Wife", 20000, sqliteUTC(now));
		now.setHours(8);
		insertAccount.run(uid(), "Mohtashim", 20000, sqliteUTC(now));
	}
});
// Run initialization
initSchema();
populateAccounts();
populateDefaults();

const normalizeCategoryGroupState = db.transaction(() => {
	db.exec(`
    UPDATE category_group
    SET is_income = CASE WHEN lower(name) = 'income' THEN 1 ELSE 0 END
    WHERE lower(name) = 'income' OR is_income = 1;
  `);

	const incomeGroups = db
		.prepare(
			"SELECT id FROM category_group WHERE is_income = 1 ORDER BY id ASC",
		)
		.all() as Array<{ id: string }>;

	if (incomeGroups.length > 1) {
		const keepId = incomeGroups[0]?.id;
		db.prepare(
			`UPDATE category_group SET is_income = 0 WHERE is_income = 1 AND id != ?`,
		).run(keepId);
	}

	if (incomeGroups.length === 0) {
		const incomeGroupId = uid();
		db.prepare(
			"INSERT INTO category_group (id, name, sort_order, is_income) VALUES (?, 'Income', 9999, 1)",
		).run(incomeGroupId);
		const existingIncomeCategory = db
			.prepare("SELECT id FROM categories WHERE lower(name) = 'income'")
			.get() as { id: string } | undefined;
		if (!existingIncomeCategory) {
			db.prepare(
				"INSERT INTO categories (id, name, group_id, sort_order) VALUES (?, 'Income', ?, 1)",
			).run(uid(), incomeGroupId);
		}
	}

	const allGroups = db
		.prepare(
			"SELECT id, is_income FROM category_group ORDER BY sort_order ASC, id ASC",
		)
		.all() as Array<{ id: string; is_income: number }>;

	let sortOrder = 1;
	for (const group of allGroups) {
		if (group.is_income === 1) continue;
		db.prepare("UPDATE category_group SET sort_order = ? WHERE id = ?").run(
			sortOrder,
			group.id,
		);
		sortOrder += 1;
	}

	const incomeGroup = db
		.prepare("SELECT id FROM category_group WHERE is_income = 1 LIMIT 1")
		.get() as { id: string } | undefined;
	if (incomeGroup) {
		db.prepare("UPDATE category_group SET sort_order = 9999 WHERE id = ?").run(
			incomeGroup.id,
		);
	}

	const groupIds = db
		.prepare("SELECT id FROM category_group ORDER BY id ASC")
		.all() as Array<{ id: string }>;
	for (const group of groupIds) {
		const cats = db
			.prepare(
				"SELECT id FROM categories WHERE group_id = ? ORDER BY sort_order ASC, name ASC, id ASC",
			)
			.all(group.id) as Array<{ id: string }>;
		let categoryOrder = 1;
		for (const category of cats) {
			db.prepare("UPDATE categories SET sort_order = ? WHERE id = ?").run(
				categoryOrder,
				category.id,
			);
			categoryOrder += 1;
		}
	}
});

normalizeCategoryGroupState();

db.exec(`
  CREATE TRIGGER IF NOT EXISTS prevent_income_group_delete
  BEFORE DELETE ON category_group
  WHEN OLD.is_income = 1
  BEGIN
    SELECT RAISE(ABORT, 'Income group cannot be deleted');
  END;
`);

console.log(`Database initialized and ready at ${dbPath}`);
export default db;
