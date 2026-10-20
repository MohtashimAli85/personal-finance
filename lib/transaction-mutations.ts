import { and, eq, inArray, isNotNull, ne, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { UserError } from "@/lib/user-error";

type TransactionInsert = typeof transactions.$inferInsert;

export type TransactionPatch = Partial<
	Pick<
		TransactionInsert,
		"account_id" | "category_id" | "payment" | "deposit" | "date" | "notes"
	>
>;

/** What a transfer's other leg takes from an edit: the amount, flipped to the
 * other side, and the date. */
function mirrorPatch(patch: TransactionPatch): TransactionPatch {
	const mirrored: TransactionPatch = {};
	if ("payment" in patch) {
		mirrored.payment = patch.deposit;
		mirrored.deposit = patch.payment;
	}
	if (patch.date) mirrored.date = patch.date;
	return mirrored;
}

const isEmpty = (patch: TransactionPatch) => Object.keys(patch).length === 0;

export function updateTransactionRecord(id: string, patch: TransactionPatch) {
	db.transaction(() => {
		const existing = db
			.select({ transfer_id: transactions.transfer_id })
			.from(transactions)
			.where(eq(transactions.id, id))
			.get();
		if (!existing) throw new UserError("Transaction not found.");

		const partner = existing.transfer_id
			? db
					.select({ id: transactions.id, account_id: transactions.account_id })
					.from(transactions)
					.where(
						and(
							eq(transactions.transfer_id, existing.transfer_id),
							ne(transactions.id, id),
						),
					)
					.get()
			: undefined;
		if (
			partner &&
			patch.account_id &&
			patch.account_id === partner.account_id
		) {
			throw new UserError("Cannot transfer an account to itself");
		}

		if (!isEmpty(patch)) {
			db.update(transactions).set(patch).where(eq(transactions.id, id)).run();
		}
		const mirrored = mirrorPatch(patch);
		if (partner && !isEmpty(mirrored)) {
			db.update(transactions)
				.set(mirrored)
				.where(eq(transactions.id, partner.id))
				.run();
		}
	});
}

export function createTransactionRecord(
	values: Omit<TransactionInsert, "id">,
): string {
	const id = crypto.randomUUID();
	db.insert(transactions)
		.values({ ...values, id })
		.run();
	return id;
}

/** Deletes the transactions and the other leg of any transfer among them. */
export function deleteTransactionRecords(ids: string[]) {
	if (ids.length === 0) return;
	db.transaction(() => {
		const transferIds = db
			.select({ transfer_id: transactions.transfer_id })
			.from(transactions)
			.where(
				and(inArray(transactions.id, ids), isNotNull(transactions.transfer_id)),
			)
			.all()
			.flatMap((row) => (row.transfer_id ? [row.transfer_id] : []));
		db.delete(transactions)
			.where(
				or(
					inArray(transactions.id, ids),
					transferIds.length
						? inArray(transactions.transfer_id, transferIds)
						: undefined,
				),
			)
			.run();
	});
}

/**
 * Creates a linked pair of transactions moving money between two of the
 * user's own accounts. Transfer legs carry no category and are excluded from
 * income/expense summaries and budget activity, so moving your own money is
 * never counted as income or spending.
 */
export function createTransferRecord(input: {
	fromAccountId: string;
	toAccountId: string;
	amount: number;
	date: string;
	notes?: string | null;
}) {
	if (input.fromAccountId === input.toAccountId) {
		throw new UserError("Cannot transfer an account to itself");
	}
	if (input.amount <= 0) {
		throw new UserError("Transfer amount must be greater than zero");
	}
	const transferId = crypto.randomUUID();
	const leg = (
		accountId: string,
		payment: number | null,
		deposit: number | null,
	): TransactionInsert => ({
		id: crypto.randomUUID(),
		account_id: accountId,
		payment,
		deposit,
		date: input.date,
		notes: input.notes || "Transfer",
		source: "transfer",
		status: "cleared",
		transfer_id: transferId,
	});
	db.insert(transactions)
		.values([
			leg(input.fromAccountId, input.amount, null),
			leg(input.toAccountId, null, input.amount),
		])
		.run();
}
