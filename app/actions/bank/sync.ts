"use server";

import { z } from "zod";
import { importEmailTransactions } from "@/lib/bank-import";
import * as review from "@/lib/bank-review";
import { getEnabledBankSenderConfigs } from "@/lib/mail/bank-sender-config";
import { getMailCredentials } from "@/lib/mail/credentials";
import {
	getAllEmails,
	getStoredEmailIds,
	upsertEmails,
} from "@/lib/mail/gmail-store";
import { fetchNewEmails } from "@/lib/mail/imap";
import { serverAction } from "@/lib/server-action";
import { UserError } from "@/lib/user-error";
import { id, optionalId } from "@/lib/validation";

export const syncBankTransactions = serverAction(z.void(), async () => {
	const configs = getEnabledBankSenderConfigs();
	if (configs.length === 0) {
		throw new UserError(
			"No bank sender configured yet. Add one below to start importing.",
		);
	}
	const credentials = getMailCredentials();
	if (!credentials) {
		throw new UserError("Connect your Gmail with an app password first.");
	}

	try {
		upsertEmails(
			await fetchNewEmails(
				credentials,
				configs.map((c) => c.senderEmail),
				getStoredEmailIds(),
			),
		);
	} catch (error) {
		console.error("Bank sync error:", error);
		throw new UserError(
			error instanceof Error ? error.message : "Failed to fetch bank emails",
		);
	}
	// Re-derives over every stored email, not just the unprocessed ones, so a
	// mis-parsed description from an earlier run is repaired too.
	const payload = await importEmailTransactions(getAllEmails(), configs, {
		repairDescriptions: true,
	});
	return { success: true, payload };
});

export const acceptBankTransaction = serverAction(
	z.object({ id, categoryId: optionalId }),
	({ id, categoryId }) => {
		review.acceptBankTransactions([id], categoryId);
	},
);

export const rejectBankTransaction = serverAction(id, (transactionId) => {
	review.rejectBankTransaction(transactionId);
});
