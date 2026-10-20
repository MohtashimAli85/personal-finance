"use server";
import { z } from "zod";
import { saveBalanceCheckRecord } from "@/lib/balance-check";
import { serverAction } from "@/lib/server-action";
import { cents, optionalId } from "@/lib/validation";

/** Adjustment amounts are signed decimals: positive adds money to the account. */
export const saveBalanceCheck = serverAction(
	z.object({
		accountId: optionalId,
		adjustments: z.array(z.object({ categoryId: optionalId, amount: cents })),
	}),
	({ accountId, adjustments }) => {
		saveBalanceCheckRecord(accountId, adjustments);
		return { success: true, message: "Balance verified." };
	},
);
