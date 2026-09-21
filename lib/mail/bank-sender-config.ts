import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bank_sender_configs } from "@/lib/db/schema";

export interface BankSenderConfig {
	id: string;
	senderEmail: string;
	accountName: string;
	enabled: boolean;
}

function toConfig(
	row: typeof bank_sender_configs.$inferSelect,
): BankSenderConfig {
	return {
		id: row.id,
		senderEmail: row.sender_email,
		accountName: row.account_name,
		enabled: row.enabled,
	};
}

export function getBankSenderConfigs(): BankSenderConfig[] {
	return db.select().from(bank_sender_configs).all().map(toConfig);
}

export function getEnabledBankSenderConfigs(): BankSenderConfig[] {
	return getBankSenderConfigs().filter((config) => config.enabled);
}

export function addBankSenderConfig(
	senderEmail: string,
	accountName: string,
): BankSenderConfig {
	const row = {
		id: crypto.randomUUID(),
		sender_email: senderEmail.trim().toLowerCase(),
		account_name: accountName.trim(),
		enabled: true,
	};
	db.insert(bank_sender_configs).values(row).run();
	return toConfig({ ...row, created_at: null });
}

export function setBankSenderConfigEnabled(id: string, enabled: boolean): void {
	db.update(bank_sender_configs)
		.set({ enabled })
		.where(eq(bank_sender_configs.id, id))
		.run();
}

export function removeBankSenderConfig(id: string): void {
	db.delete(bank_sender_configs).where(eq(bank_sender_configs.id, id)).run();
}

// Matches a message's "From" header against the configured sender list -
// case-insensitive substring match, since headers look like
// `Meezan Bank <no-reply@meezanbank.com>` rather than a bare address.
export function matchSenderConfig(
	fromHeader: string | null,
	configs: BankSenderConfig[],
): BankSenderConfig | null {
	if (!fromHeader) return null;
	const lower = fromHeader.toLowerCase();
	return (
		configs.find((config) => lower.includes(config.senderEmail)) ?? null
	);
}
