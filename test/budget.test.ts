import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "./db-test-utils";

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

let ctx: Awaited<ReturnType<typeof createTestDb>>;
let budget: typeof import("@/lib/budget");
let actions: typeof import("@/app/actions/budget/mutations");
let incomeCategoryId: string;
let account: string;

beforeAll(async () => {
	ctx = await createTestDb();
	budget = await import("@/lib/budget");
	actions = await import("@/app/actions/budget/mutations");
	const incomeGroup = ctx.db
		.select()
		.from(ctx.schema.category_group)
		.where(eq(ctx.schema.category_group.is_income, true))
		.get();
	incomeCategoryId = randomUUID();
	ctx.db
		.insert(ctx.schema.categories)
		.values({
			id: incomeCategoryId,
			name: "Salary Test",
			group_id: incomeGroup?.id,
		})
		.run();
});

beforeEach(() => {
	const { db, schema } = ctx;
	db.delete(schema.transactions).run();
	db.delete(schema.monthly_budgets).run();
	db.delete(schema.budget_months).run();
	db.delete(schema.accounts).run();
	account = seedAccount("Checking", "on_budget");
});

function seedAccount(name: string, type: "on_budget" | "off_budget") {
	const id = randomUUID();
	ctx.db
		.insert(ctx.schema.accounts)
		.values({ id, name: `${name} ${id}`, account_type: type })
		.run();
	return id;
}

function seedCategory(hidden = false) {
	const groupId = randomUUID();
	const categoryId = randomUUID();
	ctx.db
		.insert(ctx.schema.category_group)
		.values({ id: groupId, name: `Group ${groupId}` })
		.run();
	ctx.db
		.insert(ctx.schema.categories)
		.values({
			id: categoryId,
			name: `Category ${categoryId}`,
			group_id: groupId,
			hidden,
		})
		.run();
	return categoryId;
}

function tx(
	categoryId: string | null,
	date: string,
	amount: number,
	options: { accountId?: string; status?: string } = {},
) {
	ctx.db
		.insert(ctx.schema.transactions)
		.values({
			id: randomUUID(),
			account_id: options.accountId ?? account,
			category_id: categoryId,
			payment: amount < 0 ? -amount : null,
			deposit: amount > 0 ? amount : null,
			date,
			status: options.status ?? "cleared",
		})
		.run();
}

function assign(
	categoryId: string,
	month: string,
	amount: number,
	carryover = false,
) {
	ctx.db
		.insert(ctx.schema.monthly_budgets)
		.values({ category_id: categoryId, month, amount, carryover })
		.run();
}

const categoryIn = (month: string, categoryId: string) =>
	budget
		.getBudgetView(month)
		.groups.flatMap((g) => g.categories)
		.find((c) => c.id === categoryId);

describe("Actual-style envelope budget", () => {
	it("builds To Budget from income and carries the leftover forward", () => {
		const rent = seedCategory();
		tx(incomeCategoryId, "2026-01-01", 100_000);
		assign(rent, "2026-01", 60_000);
		assign(rent, "2026-02", 10_000);

		const jan = budget.getBudgetView("2026-01");
		expect(jan).toMatchObject({
			income: 100_000,
			availableFunds: 100_000,
			budgeted: 60_000,
			toBudget: 40_000,
		});

		const feb = budget.getBudgetView("2026-02");
		expect(feb).toMatchObject({
			income: 0,
			fromLastMonth: 40_000,
			availableFunds: 40_000,
			budgeted: 10_000,
			toBudget: 30_000,
		});
	});

	it("rolls a positive balance forward", () => {
		const groceries = seedCategory();
		assign(groceries, "2026-01", 10_000);
		tx(groceries, "2026-01-15", -4_000);

		expect(categoryIn("2026-01", groceries)).toMatchObject({
			budgeted: 10_000,
			spent: -4_000,
			balance: 6_000,
		});
		expect(categoryIn("2026-02", groceries)).toMatchObject({
			budgeted: 0,
			spent: 0,
			balance: 6_000,
		});
	});

	it("resets overspending to 0 and takes it from next month's To Budget", () => {
		const dining = seedCategory();
		tx(incomeCategoryId, "2026-03-01", 50_000);
		assign(dining, "2026-03", 5_000);
		tx(dining, "2026-03-10", -8_000);

		expect(categoryIn("2026-03", dining)?.balance).toBe(-3_000);
		expect(budget.getBudgetView("2026-03").toBudget).toBe(45_000);

		const apr = budget.getBudgetView("2026-04");
		expect(categoryIn("2026-04", dining)?.balance).toBe(0);
		expect(apr.lastMonthOverspent).toBe(-3_000);
		expect(apr.toBudget).toBe(42_000);
	});

	it("carries overspending forward instead when rollover is on", () => {
		const dining = seedCategory();
		tx(incomeCategoryId, "2026-03-01", 50_000);
		assign(dining, "2026-03", 5_000, true);
		tx(dining, "2026-03-10", -8_000);

		const apr = budget.getBudgetView("2026-04");
		expect(categoryIn("2026-04", dining)?.balance).toBe(-3_000);
		expect(apr.lastMonthOverspent).toBe(0);
		expect(apr.toBudget).toBe(45_000);
	});

	it("holds money for next month", () => {
		tx(incomeCategoryId, "2026-05-01", 100_000);
		ctx.db
			.insert(ctx.schema.budget_months)
			.values({ month: "2026-05", buffered: 30_000 })
			.run();

		expect(budget.getBudgetView("2026-05")).toMatchObject({
			buffered: 30_000,
			toBudget: 70_000,
		});
		expect(budget.getBudgetView("2026-06")).toMatchObject({
			fromLastMonth: 100_000,
			toBudget: 100_000,
		});
	});

	it("nets refunds and counts pending transactions like Actual", () => {
		const shopping = seedCategory();
		assign(shopping, "2026-05", 10_000);
		tx(shopping, "2026-05-05", -8_000);
		tx(shopping, "2026-05-06", 2_000);
		tx(shopping, "2026-05-07", -1_000, { status: "pending" });

		expect(categoryIn("2026-05", shopping)).toMatchObject({
			spent: -7_000,
			balance: 3_000,
		});
	});

	it("ignores off-budget accounts and reports uncategorized spending", () => {
		const fuel = seedCategory();
		const savings = seedAccount("Savings", "off_budget");
		tx(fuel, "2026-07-02", -5_000, { accountId: savings });
		tx(null, "2026-07-03", -1_500);

		const jul = budget.getBudgetView("2026-07");
		expect(categoryIn("2026-07", fuel)?.spent).toBe(0);
		expect(jul.uncategorizedActivity).toBe(1_500);
		expect(jul.toBudget).toBe(0);
	});

	it("lists income separately and still counts hidden categories", () => {
		const hidden = seedCategory(true);
		tx(incomeCategoryId, "2026-08-01", 20_000);
		assign(hidden, "2026-08", 5_000);

		const aug = budget.getBudgetView("2026-08");
		expect(aug.groups.some((g) => g.is_income)).toBe(false);
		expect(
			aug.incomeGroup?.categories.find((c) => c.id === incomeCategoryId),
		).toMatchObject({ received: 20_000 });
		expect(categoryIn("2026-08", hidden)?.hidden).toBe(true);
		expect(aug.toBudget).toBe(15_000);
	});
});

describe("budget actions", () => {
	it("applies rollover to the month and every later month", async () => {
		const dining = seedCategory();
		assign(dining, "2026-09", 1_000);
		assign(dining, "2026-11", 1_000);

		await actions.setCategoryCarryover(dining, "2026-10", true);

		expect(categoryIn("2026-09", dining)?.carryover).toBe(false);
		expect(categoryIn("2026-10", dining)?.carryover).toBe(true);
		expect(categoryIn("2026-11", dining)?.carryover).toBe(true);

		await actions.setBudgetedAmount(dining, "2026-10", 0);
		expect(categoryIn("2026-10", dining)?.carryover).toBe(true);

		await actions.setBudgetedAmount(dining, "2026-12", 50);
		expect(categoryIn("2026-12", dining)?.carryover).toBe(true);
	});

	it("caps a hold at what's left to budget and can reset it", async () => {
		tx(incomeCategoryId, "2026-10-01", 40_000);

		expect(await actions.holdForNextMonth("2026-10", 1_000)).toEqual({
			buffered: 40_000,
		});
		expect(budget.getBudgetView("2026-10").toBudget).toBe(0);

		await actions.resetHold("2026-10");
		expect(budget.getBudgetView("2026-10")).toMatchObject({
			buffered: 0,
			toBudget: 40_000,
		});
	});
});
