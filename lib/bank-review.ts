import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { rejected_bank_imports, transactions } from "@/lib/db/schema";

/** Accepts pending imported transactions into the ledger with the category
 * chosen for each (null leaves it uncategorized), so they count toward budget
 * activity immediately. */
export function acceptBankTransactions(
	items: { id: string; categoryId: string | null }[],
) {
	db.transaction(() => {
		for (const { id, categoryId } of items) {
			db.update(transactions)
				.set({ status: "cleared", category_id: categoryId })
				.where(eq(transactions.id, id))
				.run();
		}
	});
}

/** Rejects pending imported transactions: removes them from the ledger and
 * remembers their emails so a later sync doesn't import them again. */
export function rejectBankTransactions(ids: string[]) {
	db.transaction(() => {
		const rejected = db
			.select({ external_hash: transactions.external_hash })
			.from(transactions)
			.where(inArray(transactions.id, ids))
			.all()
			.filter((row): row is { external_hash: string } =>
				Boolean(row.external_hash),
			);
		if (rejected.length > 0) {
			db.insert(rejected_bank_imports)
				.values(rejected)
				.onConflictDoNothing()
				.run();
		}
		db.delete(transactions).where(inArray(transactions.id, ids)).run();
	});
}

export function isRejectedImport(hash: string) {
	return Boolean(
		db
			.select()
			.from(rejected_bank_imports)
			.where(eq(rejected_bank_imports.external_hash, hash))
			.get(),
	);
}
