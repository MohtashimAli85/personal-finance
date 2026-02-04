import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

// NOTE: In Electron/packaged apps, use app.getPath('userData') instead of process.cwd()
const dbPath = path.join(process.cwd(), "db.sqlite");
const dbDir = path.dirname(dbPath);

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
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      balance REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      category_id INTEGER,
      amount REAL NOT NULL,
      description TEXT,
      notes TEXT,
      date TEXT NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    -- 5. Index for performance (Crucial for offline speed)
    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
  `);
});

// Run initialization
initSchema();

console.log(`Database initialized and ready at ${dbPath}`);
export default db;
