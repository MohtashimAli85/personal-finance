import { sqlite } from "./client";

let registered = false;

/**
 * Checkpoints the WAL and closes the database handle on process exit, so a
 * quit doesn't leave a large db.sqlite-wal behind and every committed write
 * is folded into the main file. Safe to call more than once.
 */
export function registerShutdownHandlers() {
	if (registered) return;
	registered = true;

	let closed = false;
	const shutdown = () => {
		if (closed || !sqlite.open) return;
		closed = true;
		try {
			sqlite.pragma("wal_checkpoint(TRUNCATE)");
			sqlite.close();
		} catch (error) {
			console.error("Error during database shutdown:", error);
		}
	};

	process.once("SIGTERM", () => {
		shutdown();
		process.exit(0);
	});
	process.once("SIGINT", () => {
		shutdown();
		process.exit(0);
	});
	process.once("beforeExit", shutdown);
	process.once("exit", shutdown);
}
