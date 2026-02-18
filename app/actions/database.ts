import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { format } from "date-fns";

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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      balance REAL DEFAULT 0,
	  created_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS category_group (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      group_id INTEGER,
      FOREIGN KEY (group_id) REFERENCES category_group(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER ,
      category_id INTEGER,
      payment REAL,
      notes TEXT,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deposit REAL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    -- 5. Index for performance (Crucial for offline speed)
    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
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
			"INSERT INTO category_group (name) VALUES (?)",
		);
		const insertCategory = db.prepare(
			"INSERT INTO categories (name, group_id) VALUES (?, ?)",
		);

		for (const { group, categories } of defaults) {
			const result = insertGroup.run(group);
			const groupId = result.lastInsertRowid;

			for (const category of categories) {
				insertCategory.run(category, groupId);
			}
		}
	}
});
// 6. populate accounts
const populateAccounts = db.transaction(() => {
	const accountCount = db
		.prepare("SELECT COUNT(*) as count FROM accounts")
		.get() as { count: number };
	if (accountCount.count === 0) {
		const insertAccount = db.prepare(
			"INSERT INTO accounts (name, balance, created_at) VALUES (?, ?, ?)",
		);
		const now = new Date(new Date().toUTCString());
		now.setHours(6); // Set to start of the day
		const sqliteUTC = (date: Date) => format(date, "yyyy-MM-dd HH:mm:ss");
		insertAccount.run("Savings", 50000, sqliteUTC(now));
		now.setHours(7);
		insertAccount.run("Wife", 20000, sqliteUTC(now));
		now.setHours(8);
		insertAccount.run("Mohtashim", 20000, sqliteUTC(now));
	}
});
// Run initialization
initSchema();
populateAccounts();
populateDefaults();

console.log(`Database initialized and ready at ${dbPath}`);
export default db;
