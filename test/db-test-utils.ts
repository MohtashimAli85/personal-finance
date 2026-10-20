import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";

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
	const { ensureDatabaseReady } = await import("@/lib/db/bootstrap");
	ensureDatabaseReady();
	const schema = await import("@/lib/db/schema");
	const { accountBalance } = await import("@/lib/balance");
	const { db } = dbModule;

	return {
		db,
		sqlite: dbModule.sqlite,
		schema,
		/** Inserts an account; a non-zero opening balance is booked as an
		 * uncategorized cleared transaction dated well before any test month. */
		makeAccount(
			values: Partial<typeof schema.accounts.$inferInsert> = {},
			openingBalance = 0,
		) {
			const id = values.id ?? randomUUID();
			db.insert(schema.accounts)
				.values({ name: `Account ${id}`, ...values, id })
				.run();
			if (openingBalance !== 0) {
				db.insert(schema.transactions)
					.values({
						id: randomUUID(),
						account_id: id,
						payment: openingBalance < 0 ? -openingBalance : null,
						deposit: openingBalance > 0 ? openingBalance : null,
						date: "2000-01-01",
					})
					.run();
			}
			return id;
		},
		balanceOf(accountId: string) {
			return db
				.select({ balance: accountBalance })
				.from(schema.accounts)
				.where(eq(schema.accounts.id, accountId))
				.get()?.balance;
		},
		cleanup() {
			dbModule.sqlite.close();
			fs.rmSync(dir, { recursive: true, force: true });
		},
	};
}
