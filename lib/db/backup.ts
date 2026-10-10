import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import { format } from "date-fns";

export const backupDirFor = (dbPath: string) =>
	path.join(path.dirname(dbPath), "backups");

export function backupDatabase(
	database: Database.Database,
	dir: string,
	label: string,
) {
	fs.mkdirSync(dir, { recursive: true });
	const file = path.join(
		dir,
		`db-before-${label}-${format(new Date(), "yyyyMMdd-HHmmss")}.sqlite`,
	);
	database.exec(`VACUUM INTO '${file.replaceAll("'", "''")}'`);
	return file;
}
