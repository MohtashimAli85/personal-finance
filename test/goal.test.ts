import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb } from "./db-test-utils";

let ctx: Awaited<ReturnType<typeof createTestDb>>;
let goalLib: typeof import("@/lib/goal");

beforeAll(async () => {
	ctx = await createTestDb();
	goalLib = await import("@/lib/goal");
});

afterAll(() => ctx.cleanup());

describe("computeGoalProgress", () => {
	const computeGoalProgress: typeof import("@/lib/goal").computeGoalProgress = (
		input,
	) => goalLib.computeGoalProgress(input);

	const base = { currentMonth: "2026-10", budgetedThisMonth: 0 };

	it("spreads what's left over the months to the deadline", () => {
		const progress = computeGoalProgress({
			...base,
			targetAmount: 90_000_00,
			available: 0,
			targetMonth: "2026-12",
		});
		expect(progress.monthsLeft).toBe(3);
		expect(progress.requiredPerMonth).toBe(30_000_00);
		expect(progress.status).toBe("behind");
	});

	it("is on track when this month's budget covers the monthly need", () => {
		const progress = computeGoalProgress({
			...base,
			targetAmount: 90_000_00,
			available: 30_000_00,
			budgetedThisMonth: 30_000_00,
			targetMonth: "2026-12",
		});
		expect(progress.requiredPerMonth).toBe(30_000_00);
		expect(progress.saved).toBe(30_000_00);
		expect(progress.remaining).toBe(60_000_00);
		expect(progress.status).toBe("on_track");
	});

	it("handles funded, overdue and no-deadline goals", () => {
		expect(
			computeGoalProgress({
				...base,
				targetAmount: 100,
				available: 150,
				targetMonth: "2026-11",
			}),
		).toMatchObject({ status: "funded", remaining: 0, percent: 100 });

		expect(
			computeGoalProgress({
				...base,
				targetAmount: 100,
				available: 50,
				targetMonth: "2026-09",
			}),
		).toMatchObject({
			status: "overdue",
			monthsLeft: 0,
			requiredPerMonth: null,
		});

		expect(
			computeGoalProgress({
				...base,
				targetAmount: 100,
				available: 50,
				targetMonth: null,
			}),
		).toMatchObject({
			status: "no_deadline",
			requiredPerMonth: null,
			percent: 50,
		});
	});

	it("never reports negative progress", () => {
		const progress = computeGoalProgress({
			...base,
			targetAmount: 100,
			available: -40,
			targetMonth: null,
		});
		expect(progress.percent).toBe(0);
		expect(progress.remaining).toBe(140);
	});
});

describe("goal records", () => {
	it("creates a backing category in the Savings Goals group", () => {
		const id = goalLib.createGoalRecord({
			name: "Laptop",
			targetAmount: 250_000_00,
			targetMonth: "2027-06",
		});
		const goal = ctx.db
			.select()
			.from(ctx.schema.goals)
			.where(eq(ctx.schema.goals.id, id))
			.get();
		const category = ctx.db
			.select()
			.from(ctx.schema.categories)
			.where(eq(ctx.schema.categories.id, goal?.category_id ?? ""))
			.get();
		const group = ctx.db
			.select()
			.from(ctx.schema.category_group)
			.where(eq(ctx.schema.category_group.id, category?.group_id ?? ""))
			.get();
		expect(category?.name).toBe("Laptop");
		expect(group?.name).toBe(goalLib.SAVINGS_GROUP_NAME);

		goalLib.createGoalRecord({ name: "Trip", targetAmount: 100 });
		const groups = ctx.db
			.select()
			.from(ctx.schema.category_group)
			.where(eq(ctx.schema.category_group.name, goalLib.SAVINGS_GROUP_NAME))
			.all();
		expect(groups).toHaveLength(1);
	});

	it("refuses a name that clashes with an existing category", () => {
		expect(() =>
			goalLib.createGoalRecord({ name: "laptop", targetAmount: 100 }),
		).toThrow(goalLib.GoalError);
	});

	it("links an existing category but only once", () => {
		const groupId = randomUUID();
		const categoryId = randomUUID();
		ctx.db
			.insert(ctx.schema.category_group)
			.values({ id: groupId, name: "Long term" })
			.run();
		ctx.db
			.insert(ctx.schema.categories)
			.values({ id: categoryId, name: "Emergency fund", group_id: groupId })
			.run();

		goalLib.createGoalRecord({
			name: "Emergency",
			targetAmount: 100,
			categoryId,
		});
		expect(() =>
			goalLib.createGoalRecord({
				name: "Emergency 2",
				targetAmount: 100,
				categoryId,
			}),
		).toThrow(/already backs/);
	});

	it("reads progress from the category's envelope balance", () => {
		const accountId = randomUUID();
		ctx.db
			.insert(ctx.schema.accounts)
			.values({ id: accountId, name: "Bank", balance: 1_000_000_00 })
			.run();
		const id = goalLib.createGoalRecord({
			name: "Motorbike fund",
			targetAmount: 120_000_00,
			targetMonth: "2027-03",
		});
		const categoryId =
			ctx.db
				.select()
				.from(ctx.schema.goals)
				.where(eq(ctx.schema.goals.id, id))
				.get()?.category_id ?? "";
		ctx.db
			.insert(ctx.schema.monthly_budgets)
			.values([
				{ category_id: categoryId, month: "2026-09", amount: 20_000_00 },
				{ category_id: categoryId, month: "2026-10", amount: 20_000_00 },
			])
			.run();

		const motorbike = goalLib
			.getGoals({ month: "2026-10" })
			.find((goal) => goal.id === id);
		expect(motorbike).toMatchObject({
			saved: 40_000_00,
			remaining: 80_000_00,
			budgetedThisMonth: 20_000_00,
			monthsLeft: 6,
			requiredPerMonth: 16_666_67,
			status: "on_track",
		});
	});

	it("renames the category along with the goal, archives and deletes", () => {
		const id = goalLib.createGoalRecord({ name: "Phone", targetAmount: 100 });
		goalLib.updateGoalRecord(id, { name: "New phone", targetAmount: 200 });
		const goal = goalLib
			.getGoals({ month: "2026-10" })
			.find((item) => item.id === id);
		expect(goal).toMatchObject({
			name: "New phone",
			categoryName: "New phone",
			targetAmount: 200,
		});

		goalLib.setGoalArchived(id, true);
		expect(
			goalLib.getGoals({ month: "2026-10" }).some((item) => item.id === id),
		).toBe(false);
		expect(
			goalLib
				.getGoals({ month: "2026-10", includeArchived: true })
				.some((item) => item.id === id),
		).toBe(true);

		goalLib.deleteGoalRecord(id);
		const category = ctx.db
			.select()
			.from(ctx.schema.categories)
			.where(eq(ctx.schema.categories.name, "New phone"))
			.get();
		expect(category).toBeDefined();
	});
});
