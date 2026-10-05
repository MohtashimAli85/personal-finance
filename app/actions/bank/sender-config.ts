"use server";

import { revalidatePath } from "next/cache";
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

export type { BankSenderConfig };

export interface UnparsedEmail {
	id: string;
	subject: string | null;
	date: string | null;
	from: string | null;
}

/**
 * Bank emails that read like a transaction (they name an amount and a debit or
 * credit) but that no template could parse. These are genuine parser gaps -
 * ordinary alerts such as login notices are excluded, so an empty list means
 * nothing is being silently dropped.
 */
export async function listUnparsedBankEmailsAction(): Promise<UnparsedEmail[]> {
	const configs = getBankSenderConfigs().filter((config) => config.enabled);
	if (configs.length === 0) return [];

	const unparsed: UnparsedEmail[] = [];
	for (const email of getAllEmails()) {
		if (!matchSenderConfig(email.from, configs)) continue;

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

export async function addBankSenderConfigAction(
	senderEmail: string,
	accountName: string,
): Promise<{ success: true } | { success: false; error: string }> {
	const email = senderEmail.trim();
	const account = accountName.trim();
	if (!email || !account) {
		return {
			success: false,
			error: "Sender email and account name are both required.",
		};
	}
	if (!email.includes("@")) {
		return { success: false, error: "Enter a valid email address." };
	}

	try {
		addBankSenderConfig(email, account);
	} catch {
		return {
			success: false,
			error: "That sender is already configured.",
		};
	}

	revalidatePath("/bank-transactions");
	return { success: true };
}

export async function setBankSenderConfigEnabledAction(
	id: string,
	enabled: boolean,
): Promise<void> {
	setBankSenderConfigEnabled(id, enabled);
	revalidatePath("/bank-transactions");
}

export async function removeBankSenderConfigAction(id: string): Promise<void> {
	removeBankSenderConfig(id);
	revalidatePath("/bank-transactions");
}
