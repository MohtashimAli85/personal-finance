"use server";
import { revalidatePath } from "next/cache";
import { applyBalanceDelta } from "@/lib/balance";
import { BALANCE_VERIFIED_KEY } from "@/lib/balance-check";
import { toDateKey } from "@/lib/date";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { setSetting } from "@/lib/settings";

export interface BalanceAdjustment {
	categoryId: string | null;
	amount: number;
}

export async function saveBalanceCheck(input: {
	accountId: string | null;
	adjustments: BalanceAdjustment[];
}): Promise<ActionState> {
	const adjustments = input.adjustments.filter(
		(adjustment) => Number.isInteger(adjustment.amount) && adjustment.amount,
	);
	if (adjustments.length > 0 && !input.accountId) {
		return { success: false, message: "Pick an account for the adjustments." };
	}

	const date = toDateKey(new Date());
	db.transaction(() => {
		for (const { categoryId, amount } of adjustments) {
			db.insert(transactions)
				.values({
					id: crypto.randomUUID(),
					account_id: input.accountId,
					category_id: categoryId,
					payment: amount < 0 ? -amount : null,
					deposit: amount > 0 ? amount : null,
					date,
					notes: "Balance adjustment",
					source: "manual",
					status: "cleared",
				})
				.run();
			applyBalanceDelta(input.accountId, amount);
		}
		setSetting(BALANCE_VERIFIED_KEY, new Date().toISOString());
	});

	revalidatePath("/");
	revalidatePath("/transactions");
	revalidatePath("/budget");
	return { success: true, message: "Balance verified." };
}
