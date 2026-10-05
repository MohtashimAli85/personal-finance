/**
 * Dev-only DB reset. Run with: pnpm db:reset
 *
 * Deletes the local sqlite file (and its WAL/SHM sidecars), then re-runs
 * migrations against a fresh, empty database. No seed data is inserted.
 */
import fs from "node:fs";
import path from "node:path";

if (process.env.NODE_ENV === "production") {
	console.error("db:reset is a development-only command, refusing to run in production.");
	process.exit(1);
}

const dbPath = process.env.APP_DB_PATH ?? path.join(process.cwd(), "db.sqlite");

for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
	if (fs.existsSync(file)) fs.unlinkSync(file);
}

// Imported only after deletion: lib/db/client opens the sqlite file on import,
// so importing it earlier would recreate the file before we clear it.
const { runMigrations, ensureIncomeGroupTrigger } =
	require("../lib/db/bootstrap") as typeof import("../lib/db/bootstrap");
runMigrations();
ensureIncomeGroupTrigger();

console.log(`Database reset at ${dbPath}`);
