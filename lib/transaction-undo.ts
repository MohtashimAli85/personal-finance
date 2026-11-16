import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { UserError } from "@/lib/user-error";

type DeletedRow = typeof transactions.$inferSelect;

// On globalThis so every bundled copy of this module shares the one slot.
const store = globalThis as typeof globalThis & {
	deletedTransactions?: { token: string; rows: DeletedRow[] };
};

const isConstraintError = (error: unknown) =>
	error instanceof Error &&
	"code" in error &&
	String(error.code).startsWith("SQLITE_CONSTRAINT");

/** Keeps the latest deleted batch in memory and returns the token that
 * restores it. Only the most recent delete can be undone. */
export function stashDeleted(rows: DeletedRow[]): string {
	const token = crypto.randomUUID();
	store.deletedTransactions = { token, rows };
	return token;
}

export function restoreDeleted(token: string): number {
	const stash = store.deletedTransactions;
	if (stash?.token !== token) {
		throw new UserError("This delete can no longer be undone.");
	}
	try {
		db.transaction(() => {
			for (const row of stash.rows) db.insert(transactions).values(row).run();
		});
	} catch (error) {
		if (!isConstraintError(error)) throw error;
		throw new UserError("These transactions can no longer be restored.");
	}
	store.deletedTransactions = undefined;
	return stash.rows.length;
}
