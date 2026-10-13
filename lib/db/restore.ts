import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { backupDatabase } from "./backup";
import { migrationsFolder } from "./bootstrap";
import {
	CREATE_INCOME_GROUP_TRIGGER,
	DROP_INCOME_GROUP_TRIGGER,
} from "./income-trigger";

const SQLITE_MAGIC = "SQLite format 3\0";
const MIGRATIONS_TABLE = "__drizzle_migrations";
const NOT_A_BACKUP =
	"This isn't a Personal Finance export. Choose a .sqlite file made with Export data.";

export class RestoreError extends Error {}

const withTempDir = <T>(run: (dir: string) => T) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-restore-"));
	try {
		return run(dir);
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
};

export const exportDatabase = (database: Database.Database) =>
	withTempDir((dir) =>
		fs.readFileSync(backupDatabase(database, dir, "export")),
	);

const hasTable = (database: Database.Database, name: string) =>
	Boolean(
		database
			.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
			.get(name),
	);

const latestMigration = (database: Database.Database) =>
	(
		database
			.prepare(`SELECT max(created_at) AS latest FROM ${MIGRATIONS_TABLE}`)
			.get() as { latest: number | null }
	).latest ?? 0;

const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;

function prepareSource(file: string, target: Database.Database) {
	let source: Database.Database;
	try {
		source = new Database(file);
		if (!hasTable(source, MIGRATIONS_TABLE) || !hasTable(source, "accounts")) {
			throw new RestoreError(NOT_A_BACKUP);
		}
	} catch (error) {
		if (error instanceof RestoreError) throw error;
		throw new RestoreError(NOT_A_BACKUP);
	}
	try {
		if (latestMigration(source) > latestMigration(target)) {
			throw new RestoreError(
				"This export was made by a newer version of the app. Update the app, then import it again.",
			);
		}
		migrate(drizzle({ client: source }), {
			migrationsFolder: migrationsFolder(),
		});
	} finally {
		source.close();
	}
}

function copyTables(target: Database.Database) {
	const tables = target
		.prepare(
			`SELECT name FROM main.sqlite_master
			WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != ?`,
		)
		.all(MIGRATIONS_TABLE) as { name: string }[];

	target.transaction(() => {
		target.pragma("defer_foreign_keys = ON");
		target.exec(DROP_INCOME_GROUP_TRIGGER);
		for (const { name } of tables) {
			target.exec(`DELETE FROM main.${quote(name)}`);
		}
		for (const { name } of tables) {
			const columns = (
				target.pragma(`main.table_info(${quote(name)})`) as { name: string }[]
			)
				.map((column) => quote(column.name))
				.join(", ");
			target.exec(
				`INSERT INTO main.${quote(name)} (${columns}) SELECT ${columns} FROM source.${quote(name)}`,
			);
		}
		target.exec(CREATE_INCOME_GROUP_TRIGGER);
	})();
}

export function restoreDatabase(target: Database.Database, file: Buffer) {
	if (file.toString("latin1", 0, SQLITE_MAGIC.length) !== SQLITE_MAGIC) {
		throw new RestoreError(NOT_A_BACKUP);
	}
	withTempDir((dir) => {
		const sourcePath = path.join(dir, "export.sqlite");
		fs.writeFileSync(sourcePath, file);
		prepareSource(sourcePath, target);
		target.prepare("ATTACH DATABASE ? AS source").run(sourcePath);
		try {
			copyTables(target);
		} finally {
			target.exec("DETACH DATABASE source");
		}
	});
}
