import path from "node:path";
import { format } from "date-fns";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./client";
import { accounts, categories, category_group } from "./schema";

const uid = () => crypto.randomUUID();

const runMigrations = () => {
	migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
};

const ensureIncomeGroupTrigger = () => {
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
	normalizeCategoryGroupState();
	ensureIncomeGroupTrigger();
};
