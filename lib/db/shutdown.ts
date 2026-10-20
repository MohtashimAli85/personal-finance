import { sqlite } from "./client";

let registered = false;

/**
 * Checkpoints the WAL and closes the database handle on process exit, so a
 * quit doesn't leave a large db.sqlite-wal behind and every committed write
 * is folded into the main file. Next handles SIGTERM/SIGINT itself, draining
 * in-flight requests before it exits. Safe to call more than once.
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

	process.once("beforeExit", shutdown);
	process.once("exit", shutdown);
}
