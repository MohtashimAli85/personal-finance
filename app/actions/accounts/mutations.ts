"use server";
import { z } from "zod";
import {
	archiveAccountRecord,
	createAccountRecord,
	deleteAccountRecord,
	renameAccountRecord,
} from "@/lib/account-mutations";
import { serverAction } from "@/lib/server-action";
import { cents, id, optionalId, requiredText } from "@/lib/validation";

export const createAccount = serverAction(
	z.object({
		name: requiredText("Account name"),
		initialBalance: cents,
		offBudget: z.boolean().default(false),
	}),
	({ name, initialBalance, offBudget }) => {
		createAccountRecord({ name, startingBalance: initialBalance, offBudget });
		return { success: true, message: "Account created successfully!" };
	},
);

export const renameAccount = serverAction(
	z.object({ id, name: requiredText("Account name") }),
	({ id, name }) => {
		renameAccountRecord(id, name);
	},
);

export const archiveAccount = serverAction(
	z.object({ id, transferAccountId: optionalId }),
	({ id, transferAccountId }) => {
		archiveAccountRecord(id, transferAccountId);
	},
);

export const deleteAccount = serverAction(id, (accountId) => {
	deleteAccountRecord(accountId);
});
