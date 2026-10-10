import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { applyActualImport, loadActualData } from "../lib/actual-import";
import { backupDatabase, backupDirFor } from "../lib/db/backup";

const sourcePath = process.argv[2];
if (!sourcePath) {
	console.error(
		'Usage: pnpm tsx scripts/import-actual-db.ts "<Actual export .zip or db.sqlite>"',
	);
	process.exit(1);
}
const targetPath =
	process.env.APP_DB_PATH ?? path.join(process.cwd(), "db.sqlite");

const data = loadActualData(fs.readFileSync(sourcePath));
const target = new Database(targetPath);
target.pragma("foreign_keys = ON");
migrate(drizzle({ client: target }), {
	migrationsFolder: path.join(process.cwd(), "drizzle"),
});
const backupPath = backupDatabase(
	target,
	backupDirFor(targetPath),
	"actual-import",
);
const summary = applyActualImport(target, data);
target.close();

console.log(
	JSON.stringify({ sourcePath, targetPath, backupPath, ...summary }, null, 2),
);
