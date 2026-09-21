import { sql } from "drizzle-orm";
import {
	index,
	integer,
	primaryKey,
	real,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
	id: text("id").primaryKey(),
	name: text("name").notNull().unique(),
	balance: real("balance").default(0),
	account_type: text("account_type").notNull().default("on_budget"),
	created_at: text("created_at").default(sql`(datetime('now'))`),
});

export const category_group = sqliteTable(
	"category_group",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull().unique(),
		sort_order: integer("sort_order").notNull().default(0),
		is_income: integer("is_income", { mode: "boolean" })
			.notNull()
			.default(false),
	},
	(table) => [
		uniqueIndex("idx_category_group_single_income")
			.on(table.is_income)
			.where(sql`is_income = 1`),
	],
);

export const categories = sqliteTable("categories", {
	id: text("id").primaryKey(),
	name: text("name").notNull().unique(),
	group_id: text("group_id").references(() => category_group.id, {
		onDelete: "set null",
	}),
	sort_order: integer("sort_order").notNull().default(0),
});

export const transactions = sqliteTable(
	"transactions",
	{
		id: text("id").primaryKey(),
		account_id: text("account_id").references(() => accounts.id, {
			onDelete: "cascade",
		}),
		category_id: text("category_id").references(() => categories.id, {
			onDelete: "set null",
		}),
		payment: real("payment"),
		notes: text("notes"),
		date: text("date").default(sql`CURRENT_TIMESTAMP`),
		deposit: real("deposit"),
		source: text("source").notNull().default("manual"),
		external_hash: text("external_hash"),
	},
	(table) => [
		index("idx_transactions_account").on(table.account_id),
		index("idx_transactions_date").on(table.date),
		index("idx_transactions_category_date").on(table.category_id, table.date),
		uniqueIndex("idx_transactions_external_hash").on(table.external_hash),
	],
);

export const monthly_budgets = sqliteTable(
	"monthly_budgets",
	{
		category_id: text("category_id")
			.notNull()
			.references(() => categories.id, { onDelete: "cascade" }),
		month: text("month").notNull(),
		amount: real("amount").notNull().default(0),
	},
	(table) => [
		primaryKey({ columns: [table.category_id, table.month] }),
		index("idx_monthly_budgets_month_category").on(
			table.month,
			table.category_id,
		),
	],
);

export const mail_credentials = sqliteTable("mail_credentials", {
	id: text("id").primaryKey(),
	email: text("email").notNull(),
	app_password: text("app_password").notNull(),
	updated_at: text("updated_at").default(sql`(datetime('now'))`),
});

export const gmail_messages = sqliteTable(
	"gmail_messages",
	{
		id: text("id").primaryKey(),
		thread_id: text("thread_id"),
		history_id: text("history_id"),
		from: text("from"),
		subject: text("subject"),
		date: text("date"),
		internal_date: text("internal_date"),
		snippet: text("snippet"),
		body_text: text("body_text"),
		received_at: text("received_at").default(sql`(datetime('now'))`),
		processed: integer("processed", { mode: "boolean" })
			.notNull()
			.default(false),
	},
	(table) => [
		index("idx_gmail_messages_internal_date").on(table.internal_date),
	],
);

export const gmail_sync_state = sqliteTable("gmail_sync_state", {
	id: text("id").primaryKey(),
	history_id: text("history_id"),
	updated_at: text("updated_at").default(sql`(datetime('now'))`),
});

export const bank_sender_configs = sqliteTable(
	"bank_sender_configs",
	{
		id: text("id").primaryKey(),
		sender_email: text("sender_email").notNull().unique(),
		account_name: text("account_name").notNull(),
		enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
		created_at: text("created_at").default(sql`(datetime('now'))`),
	},
	(table) => [index("idx_bank_sender_configs_enabled").on(table.enabled)],
);
