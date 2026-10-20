import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";

/** Accepts pending imported transactions into the ledger. A `categoryId`
 * (null clears it) is set on each, so they count toward budget activity
 * immediately; leave it undefined to keep their current category. */
export function acceptBankTransactions(
	ids: string[],
	categoryId?: string | null,
) {
	db.update(transactions)
		.set({
			status: "cleared",
			...(categoryId !== undefined ? { category_id: categoryId } : {}),
		})
		.where(inArray(transactions.id, ids))
		.run();
}

/** Rejects a pending imported transaction: removes it from the ledger. */
export function rejectBankTransaction(id: string) {
	db.delete(transactions).where(eq(transactions.id, id)).run();
}
