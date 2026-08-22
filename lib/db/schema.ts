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
	},
	(table) => [
		index("idx_transactions_account").on(table.account_id),
		index("idx_transactions_date").on(table.date),
		index("idx_transactions_category_date").on(table.category_id, table.date),
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
