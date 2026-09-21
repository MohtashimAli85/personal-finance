import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, bank_sender_configs } from "@/lib/db/schema";

export interface BankSenderConfig {
	id: string;
	senderEmail: string;
	accountName: string;
	accountId: string;
	enabled: boolean;
}

function toConfig(
	row: typeof bank_sender_configs.$inferSelect & { accountName: string },
): BankSenderConfig {
	return {
		id: row.id,
		senderEmail: row.sender_email,
		accountName: row.accountName,
		accountId: row.account_id ?? "",
		enabled: row.enabled,
	};
}

export function getBankSenderConfigs(): BankSenderConfig[] {
	return db
		.select({
			id: bank_sender_configs.id,
			sender_email: bank_sender_configs.sender_email,
			account_name: bank_sender_configs.account_name,
			account_id: bank_sender_configs.account_id,
			enabled: bank_sender_configs.enabled,
			created_at: bank_sender_configs.created_at,
			accountName: accounts.name,
		})
		.from(bank_sender_configs)
		.leftJoin(accounts, eq(bank_sender_configs.account_id, accounts.id))
		.all()
		.map((row) =>
			toConfig({ ...row, accountName: row.accountName ?? row.account_name }),
		);
}

export function getEnabledBankSenderConfigs(): BankSenderConfig[] {
	return getBankSenderConfigs().filter((config) => config.enabled);
}

/** Finds an account by name or creates it (on-budget, zero balance). */
function ensureAccountId(name: string): string {
	const trimmed = name.trim();
	const existing = db
		.select({ id: accounts.id })
		.from(accounts)
		.where(eq(accounts.name, trimmed))
		.get();
	if (existing) return existing.id;
	const id = crypto.randomUUID();
	db.insert(accounts).values({ id, name: trimmed, balance: 0 }).run();
	return id;
}

export function addBankSenderConfig(
	senderEmail: string,
	accountName: string,
): BankSenderConfig {
	const accountId = ensureAccountId(accountName);
	const row = {
		id: crypto.randomUUID(),
		sender_email: senderEmail.trim().toLowerCase(),
		account_name: accountName.trim(),
		account_id: accountId,
		enabled: true,
	};
	db.insert(bank_sender_configs).values(row).run();
	return toConfig({
		...row,
		created_at: null,
		accountName: accountName.trim(),
	});
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
	return configs.find((config) => lower.includes(config.senderEmail)) ?? null;
}
