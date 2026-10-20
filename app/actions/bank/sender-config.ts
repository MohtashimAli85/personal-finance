"use server";

import { z } from "zod";
import { parseBankEmail } from "@/lib/bank-email-parse";
import {
	addBankSenderConfig,
	type BankSenderConfig,
	getBankSenderConfigs,
	matchSenderConfig,
	removeBankSenderConfig,
	setBankSenderConfigEnabled,
} from "@/lib/mail/bank-sender-config";
import { getAllEmails } from "@/lib/mail/gmail-store";
import { serverAction } from "@/lib/server-action";
import { UserError } from "@/lib/user-error";
import { id, requiredText } from "@/lib/validation";

export type { BankSenderConfig };

export interface UnparsedEmail {
	id: string;
	subject: string | null;
	date: string | null;
	from: string | null;
}

/**
 * Bank emails that read like a transaction (they name an amount and a debit or
 * credit) but that neither a template nor the AI pass could parse. These are genuine parser gaps -
 * ordinary alerts such as login notices are excluded, so an empty list means
 * nothing is being silently dropped.
 */
export async function listUnparsedBankEmailsAction(): Promise<UnparsedEmail[]> {
	const configs = getBankSenderConfigs().filter((config) => config.enabled);
	if (configs.length === 0) return [];

	const unparsed: UnparsedEmail[] = [];
	for (const email of getAllEmails()) {
		if (!matchSenderConfig(email.from, configs)) continue;
		// The AI pass has already read it, so it isn't stuck anymore.
		if (email.ai_parse) continue;

		const outcome = parseBankEmail({
			from: email.from,
			subject: email.subject,
			body: email.body_text ?? "",
			receivedAt: email.date,
		});
		if (outcome.failure !== "unrecognized-format") continue;

		unparsed.push({
			id: email.id,
			subject: email.subject,
			date: email.date,
			from: email.from,
		});
	}

	return unparsed.slice(0, 25);
}

export async function listBankSenderConfigsAction(): Promise<
	BankSenderConfig[]
> {
	return getBankSenderConfigs();
}

export const addBankSenderConfigAction = serverAction(
	z.object({
		senderEmail: z
			.string()
			.trim()
			.pipe(z.email("Enter a valid email address.")),
		accountName: requiredText("Account name"),
	}),
	({ senderEmail, accountName }) => {
		try {
			addBankSenderConfig(senderEmail, accountName);
		} catch {
			throw new UserError("That sender is already configured.");
		}
	},
);

export const setBankSenderConfigEnabledAction = serverAction(
	z.object({ id, enabled: z.boolean() }),
	({ id, enabled }) => {
		setBankSenderConfigEnabled(id, enabled);
	},
);

export const removeBankSenderConfigAction = serverAction(id, (configId) => {
	removeBankSenderConfig(configId);
});
