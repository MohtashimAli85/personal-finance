import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Creates an isolated temp SQLite database with migrations applied and
 * returns the app's real db modules bound to it.
 *
 * IMPORTANT: lib/db/client.ts reads process.env.APP_DB_PATH at module-load
 * time, so this sets the env var and *then* dynamically imports lib/db -
 * a static top-level `import` would be hoisted above the env assignment
 * and silently connect to the default (real project) database instead.
 */
export async function createTestDb() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-test-"));
	const dbPath = path.join(dir, `${randomUUID()}.sqlite`);
	process.env.APP_DB_PATH = dbPath;

	const dbModule = await import("@/lib/db");
	const schema = await import("@/lib/db/schema");

	return {
		db: dbModule.db,
		sqlite: dbModule.sqlite,
		schema,
		cleanup() {
			dbModule.sqlite.close();
			fs.rmSync(dir, { recursive: true, force: true });
		},
	};
}
