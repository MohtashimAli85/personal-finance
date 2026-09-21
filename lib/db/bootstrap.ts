import { createHash } from "node:crypto";
import path from "node:path";
import { format } from "date-fns";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { parseBankEmail } from "../bank-email-parse";
import { db } from "./client";
import {
	accounts,
	bank_sender_configs,
	categories,
	category_group,
	gmail_messages,
	transactions,
} from "./schema";

const uid = () => crypto.randomUUID();

export const runMigrations = () => {
	migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
};

export const ensureIncomeGroupTrigger = () => {
	db.run(sql`
    CREATE TRIGGER IF NOT EXISTS prevent_income_group_delete
    BEFORE DELETE ON category_group
    WHEN OLD.is_income = 1
    BEGIN
      SELECT RAISE(ABORT, 'Income group cannot be deleted');
    END;
  `);
};

const seedAccounts = () => {
	const existing = db.select({ id: accounts.id }).from(accounts).limit(1).get();
	if (existing) return;

	const now = new Date(new Date().toUTCString());
	now.setHours(6);
	const sqliteUTC = (date: Date) => format(date, "yyyy-MM-dd HH:mm:ss");

	db.transaction(() => {
		for (const [name, balance] of [
			["Savings", 50000],
			["Wife", 20000],
			["Mohtashim", 20000],
		] as const) {
			db.insert(accounts)
				.values({ id: uid(), name, balance, created_at: sqliteUTC(now) })
				.run();
			now.setHours(now.getHours() + 1);
		}
	});
};

// Preserves the pre-multi-sender behavior: anyone upgrading from the
// hardcoded Meezan-only sync keeps working without re-configuring anything.
const seedBankSenderConfigs = () => {
	const existing = db
		.select({ id: bank_sender_configs.id })
		.from(bank_sender_configs)
		.limit(1)
		.get();
	if (existing) return;

	db.insert(bank_sender_configs)
		.values({
			id: uid(),
			sender_email: "no-reply@meezanbank.com",
			account_name: "Meezan Bank",
		})
		.run();
};

// Email transactions used to be keyed by a hash of (date, amount, description),
// which collapsed genuinely distinct transactions that happened to match - two
// equal ATM withdrawals in one sitting became one row. They are keyed by Gmail
// message id now. This re-keys the rows written under the old scheme so that
// re-reading a mailbox reconciles against them instead of duplicating them.
// Idempotent: once every row carries a message-id hash, it does nothing.
const messageIdHash = (id: string) =>
	createHash("sha256").update(id).digest("hex");

const backfillEmailTransactionHashes = () => {
	const emailRows = db
		.select({
			id: gmail_messages.id,
			from: gmail_messages.from,
			subject: gmail_messages.subject,
			date: gmail_messages.date,
			body_text: gmail_messages.body_text,
		})
		.from(gmail_messages)
		.all();
	if (emailRows.length === 0) return;

	const txRows = db
		.select()
		.from(transactions)
		.where(eq(transactions.source, "email"))
		.all();
	if (txRows.length === 0) return;

	const emailHashes = new Set(emailRows.map((row) => messageIdHash(row.id)));
	const legacyRows = txRows.filter(
		(row) => !row.external_hash || !emailHashes.has(row.external_hash),
	);
	if (legacyRows.length === 0) return;

	// Group candidate emails by the facts that survived the parser changes.
	const claimed = new Set(
		txRows
			.map((row) => row.external_hash)
			.filter((hash): hash is string => Boolean(hash)),
	);
	const byFacts = new Map<string, string[]>();
	for (const row of emailRows) {
		const parsed = parseBankEmail({
			from: row.from,
			subject: row.subject,
			body: row.body_text ?? "",
			receivedAt: row.date,
		}).transaction;
		if (!parsed) continue;
		const hash = messageIdHash(row.id);
		if (claimed.has(hash)) continue;
		const key = `${parsed.date}|${parsed.amount.toFixed(2)}|${parsed.type}`;
		const bucket = byFacts.get(key);
		if (bucket) bucket.push(hash);
		else byFacts.set(key, [hash]);
	}

	let rekeyed = 0;
	for (const row of legacyRows) {
		const type = row.payment != null ? "expense" : "income";
		const amount = row.payment ?? row.deposit ?? 0;
		const key = `${row.date}|${amount.toFixed(2)}|${type}`;
		const bucket = byFacts.get(key);
		const hash = bucket?.shift();
		if (!hash) continue;

		db.update(transactions)
			.set({ external_hash: hash })
			.where(eq(transactions.id, row.id))
			.run();
		rekeyed += 1;
	}

	if (rekeyed > 0) {
		console.log(`Re-keyed ${rekeyed} imported transaction(s) to message ids.`);
	}
};

const DEFAULT_GROUPS = [
	{
		group: "Usual Expenses",
		categories: ["Food", "General", "Bills", "Bills (Flexible)"],
	},
	{
		group: "Investments and Savings",
		categories: ["Savings"],
	},
	{
		group: "Income",
		categories: ["Income", "Starting Balances"],
	},
];

const seedCategories = () => {
	const existing = db
		.select({ id: category_group.id })
		.from(category_group)
		.limit(1)
		.get();
	if (existing) return;

	db.transaction(() => {
		DEFAULT_GROUPS.forEach(({ group, categories: groupCategories }, index) => {
			const isIncome = group.toLowerCase() === "income";
			const groupId = uid();
			db.insert(category_group)
				.values({
					id: groupId,
					name: group,
					sort_order: isIncome ? 9999 : index + 1,
					is_income: isIncome,
				})
				.run();

			groupCategories.forEach((name, categoryIndex) => {
				db.insert(categories)
					.values({
						id: uid(),
						name,
						group_id: groupId,
						sort_order: categoryIndex + 1,
					})
					.run();
			});
		});
	});
};

const normalizeCategoryGroupState = () => {
	db.update(category_group)
		.set({
			is_income: sql`CASE WHEN lower(${category_group.name}) = 'income' THEN 1 ELSE 0 END`,
		})
		.where(
			sql`lower(${category_group.name}) = 'income' OR ${category_group.is_income} = 1`,
		)
		.run();

	const incomeGroups = db
		.select({ id: category_group.id })
		.from(category_group)
		.where(eq(category_group.is_income, true))
		.orderBy(asc(category_group.id))
		.all();

	if (incomeGroups.length > 1) {
		const keepId = incomeGroups[0]?.id;
		db.update(category_group)
			.set({ is_income: false })
			.where(
				and(eq(category_group.is_income, true), ne(category_group.id, keepId)),
			)
			.run();
	}

	if (incomeGroups.length === 0) {
		const incomeGroupId = uid();
		db.insert(category_group)
			.values({
				id: incomeGroupId,
				name: "Income",
				sort_order: 9999,
				is_income: true,
			})
			.run();

		const existingIncomeCategory = db
			.select({ id: categories.id })
			.from(categories)
			.where(sql`lower(${categories.name}) = 'income'`)
			.get();

		if (!existingIncomeCategory) {
			db.insert(categories)
				.values({
					id: uid(),
					name: "Income",
					group_id: incomeGroupId,
					sort_order: 1,
				})
				.run();
		}
	}

	const allGroups = db
		.select({ id: category_group.id, is_income: category_group.is_income })
		.from(category_group)
		.orderBy(asc(category_group.sort_order), asc(category_group.id))
		.all();

	let sortOrder = 1;
	for (const group of allGroups) {
		if (group.is_income) continue;
		db.update(category_group)
			.set({ sort_order: sortOrder })
			.where(eq(category_group.id, group.id))
			.run();
		sortOrder += 1;
	}

	const incomeGroup = db
		.select({ id: category_group.id })
		.from(category_group)
		.where(eq(category_group.is_income, true))
		.limit(1)
		.get();
	if (incomeGroup) {
		db.update(category_group)
			.set({ sort_order: 9999 })
			.where(eq(category_group.id, incomeGroup.id))
			.run();
	}

	const groupsWithCategories = db
		.select({ id: category_group.id })
		.from(category_group)
		.orderBy(asc(category_group.id))
		.all();

	for (const group of groupsWithCategories) {
		const groupCategories = db
			.select({ id: categories.id })
			.from(categories)
			.where(and(eq(categories.group_id, group.id)))
			.orderBy(
				asc(categories.sort_order),
				asc(categories.name),
				asc(categories.id),
			)
			.all();

		let categoryOrder = 1;
		for (const category of groupCategories) {
			db.update(categories)
				.set({ sort_order: categoryOrder })
				.where(eq(categories.id, category.id))
				.run();
			categoryOrder += 1;
		}
	}
};

export const bootstrapDatabase = () => {
	runMigrations();
	seedAccounts();
	seedCategories();
	seedBankSenderConfigs();
	backfillEmailTransactionHashes();
	normalizeCategoryGroupState();
	ensureIncomeGroupTrigger();
};
