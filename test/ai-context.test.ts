import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb } from "./db-test-utils";

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

let ctx: Awaited<ReturnType<typeof createTestDb>>;
let context: typeof import("@/lib/ai/context");
let tools: typeof import("@/lib/ai/tools");
let data: typeof import("@/lib/ai/finance-data");

let month: string;
const opts = {} as never;

function seedCategory(groupName: string, name: string, isIncome = false) {
	const incomeGroup = isIncome
		? ctx.db
				.select()
				.from(ctx.schema.category_group)
				.where(eq(ctx.schema.category_group.is_income, true))
				.get()
		: undefined;
	const groupId = incomeGroup?.id ?? randomUUID();
	const id = randomUUID();
	if (!incomeGroup) {
		ctx.db
			.insert(ctx.schema.category_group)
			.values({ id: groupId, name: groupName })
			.run();
	}
	ctx.db
		.insert(ctx.schema.categories)
		.values({ id, name, group_id: groupId })
		.run();
	return id;
}

function addTx(
	accountId: string,
	categoryId: string | null,
	date: string,
	{ payment, deposit }: { payment?: number; deposit?: number },
) {
	ctx.db
		.insert(ctx.schema.transactions)
		.values({
			id: randomUUID(),
			account_id: accountId,
			category_id: categoryId,
			date,
			payment: payment ?? null,
			deposit: deposit ?? null,
		})
		.run();
}

beforeAll(async () => {
	ctx = await createTestDb();
	context = await import("@/lib/ai/context");
	tools = await import("@/lib/ai/tools");
	data = await import("@/lib/ai/finance-data");
	const { getMonthKey } = await import("@/lib/date");
	month = getMonthKey();

	const accountId = randomUUID();
	ctx.db
		.insert(ctx.schema.accounts)
		.values({ id: accountId, name: "Main Bank", balance: 500_000_00 })
		.run();
	const salary = seedCategory("Earnings", "Paycheck", true);
	const food = seedCategory("Daily", "Groceries Test");
	const fun = seedCategory("Lifestyle", "Eating Out Test");

	for (const offset of [1, 2, 3]) {
		const m = data.addMonths(month, -offset);
		addTx(accountId, salary, `${m}-01`, { deposit: 200_000_00 });
		addTx(accountId, food, `${m}-05`, { payment: 40_000_00 });
		addTx(accountId, fun, `${m}-10`, { payment: 20_000_00 });
	}
	addTx(accountId, food, `${month}-02`, { payment: 15_000_00 });
	ctx.db
		.insert(ctx.schema.monthly_budgets)
		.values({ category_id: food, month, amount: 45_000_00 })
		.run();
});

afterAll(() => ctx.cleanup());

describe("finance snapshot", () => {
	it("summarises accounts, budget, history and goals in whole rupees", () => {
		const snapshot = context.buildFinanceSnapshot();
		expect(snapshot).toContain(`Current month: ${month}`);
		expect(snapshot).toContain("- Main Bank (on-budget): 500,000");
		expect(snapshot).toContain("- Groceries Test | 45,000 | 15,000 | 30,000");
		expect(snapshot).toContain(
			"Average: income 200,000, spending 60,000, saved 140,000 per month",
		);
		expect(snapshot).toContain("- Groceries Test: 40,000");
		expect(snapshot).toContain("SAVINGS GOALS:\nNone yet.");
		expect(snapshot).not.toMatch(/\d{7,}/);
	});
});

describe("read tools", () => {
	it("reports spending per month and per category", async () => {
		const from = data.addMonths(month, -3);
		const to = data.addMonths(month, -1);
		const byMonth = await tools.readTools.getSpending.execute?.(
			{ fromMonth: from, toMonth: to, groupBy: "month" },
			opts,
		);
		expect(byMonth).toMatchObject({
			months: [
				{ month: from, income: 200_000, spending: 60_000, net: 140_000 },
				expect.anything(),
				expect.anything(),
			],
		});

		const byCategory = await tools.readTools.getSpending.execute?.(
			{ fromMonth: from, toMonth: to, groupBy: "category" },
			opts,
		);
		expect(byCategory).toMatchObject({
			categories: [
				{ category: "Paycheck", type: "income", amount: 600_000 },
				{ category: "Groceries Test", type: "expense", amount: 120_000 },
				{ category: "Eating Out Test", type: "expense", amount: 60_000 },
			],
		});
	});

	it("returns a category trend and resolves names case-insensitively", async () => {
		const trend = await tools.readTools.getCategoryTrend.execute?.(
			{ category: "groceries test", months: 2 },
			opts,
		);
		expect(trend).toEqual({
			category: "Groceries Test",
			months: [
				{ month: data.addMonths(month, -1), budgeted: 0, spent: 40_000 },
				{ month, budgeted: 45_000, spent: 15_000 },
			],
		});
		expect(
			await tools.readTools.getCategoryTrend.execute?.(
				{ category: "Nope", months: 2 },
				opts,
			),
		).toEqual({ error: 'No category named "Nope"' });
	});

	it("does savings maths both ways", async () => {
		expect(
			await tools.readTools.simulateSavings.execute?.(
				{ targetAmount: 100_000, alreadySaved: 10_000, monthlyAmount: 30_000 },
				opts,
			),
		).toEqual({
			remaining: 90_000,
			monthsNeeded: 3,
			reachedBy: data.addMonths(month, 2),
		});
		expect(
			await tools.readTools.simulateSavings.execute?.(
				{
					targetAmount: 120_000,
					alreadySaved: 0,
					targetMonth: data.addMonths(month, 5),
				},
				opts,
			),
		).toEqual({ remaining: 120_000, monthsLeft: 6, perMonth: 20_000 });
	});

	it("finds transactions by category", async () => {
		const result = await tools.readTools.searchTransactions.execute?.(
			{ category: "Eating Out Test", limit: 2 },
			opts,
		);
		expect(result).toMatchObject({
			hasMore: true,
			transactions: [{ category: "Eating Out Test", payment: 20_000 }, {}],
		});
	});
});

describe("write tools", () => {
	it("creates a goal and funds it through the budget", async () => {
		const created = await tools.writeTools.createSavingsGoal.execute?.(
			{
				name: "Test Laptop",
				targetAmount: 150_000,
				targetMonth: data.addMonths(month, 4),
			},
			opts,
		);
		expect(created).toMatchObject({
			ok: true,
			goal: {
				name: "Test Laptop",
				target: 150_000,
				saved: 0,
				monthsLeft: 5,
				requiredPerMonth: 30_000,
				status: "behind",
			},
		});

		const funded = await tools.writeTools.setBudgetAmount.execute?.(
			{ category: "Test Laptop", month, amount: 30_000 },
			opts,
		);
		expect(funded).toMatchObject({
			ok: true,
			budgeted: 30_000,
			balance: 30_000,
		});

		const goals = await tools.readTools.getGoals.execute?.({}, opts);
		expect(goals).toMatchObject({
			goals: [{ name: "Test Laptop", saved: 30_000, status: "on_track" }],
		});
		expect(context.buildFinanceSnapshot()).toContain(
			"Test Laptop: saved 30,000 of 150,000 (20%)",
		);
	});

	it("refuses to budget an income category", async () => {
		expect(
			await tools.writeTools.setBudgetAmount.execute?.(
				{ category: "Paycheck", month, amount: 1 },
				opts,
			),
		).toEqual({ ok: false, error: "Income categories can't be budgeted" });
	});
});
