import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb } from "./db-test-utils";

let ctx: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
	ctx = await createTestDb();
});

function seedCategory(
	groupName: string,
	categoryName: string,
	isIncome = false,
) {
	const { db, schema } = ctx;
	const groupId = randomUUID();
	const categoryId = randomUUID();
	db.insert(schema.category_group)
		.values({ id: groupId, name: groupName, is_income: isIncome })
		.run();
	db.insert(schema.categories)
		.values({ id: categoryId, name: categoryName, group_id: groupId })
		.run();
	return { groupId, categoryId };
}

function seedAccount(name: string, balanceCents: number) {
	const { db, schema } = ctx;
	const id = randomUUID();
	db.insert(schema.accounts)
		.values({ id, name, balance: balanceCents, account_type: "on_budget" })
		.run();
	return id;
}

function spend(
	accountId: string,
	categoryId: string,
	date: string,
	cents: number,
) {
	const { db, schema } = ctx;
	db.insert(schema.transactions)
		.values({
			id: randomUUID(),
			account_id: accountId,
			category_id: categoryId,
			payment: cents,
			date,
			status: "cleared",
		})
		.run();
}

function assign(categoryId: string, month: string, cents: number) {
	const { db, schema } = ctx;
	db.insert(schema.monthly_budgets)
		.values({ category_id: categoryId, month, amount: cents })
		.run();
}

describe("envelope budgeting carryover", () => {
	it("carries an unspent surplus forward into the next month for free", async () => {
		const { getBudgetView } = await import("@/lib/budget");
		const account = seedAccount("Carryover Checking", 1_000_000_00);
		const { categoryId } = seedCategory("Carryover Group", "Groceries");

		// Assign 100 in January, spend only 40 - 60 should be available.
		assign(categoryId, "2026-01", 10000);
		spend(account, categoryId, "2026-01-15", 4000);

		const jan = getBudgetView("2026-01");
		const janCat = jan.groups
			.flatMap((g) => g.categories)
			.find((c) => c.id === categoryId);
		expect(janCat?.available).toBe(6000);

		// February: no new assignment, no new spending - the 60 surplus must
		// still be there. This is the core carryover behavior; the previous
		// single-month math would show 0 here.
		const feb = getBudgetView("2026-02");
		const febCat = feb.groups
			.flatMap((g) => g.categories)
			.find((c) => c.id === categoryId);
		expect(febCat?.available).toBe(6000);
		expect(febCat?.budgeted).toBe(0); // nothing newly assigned in February
	});

	it("carries overspending forward as a negative balance", async () => {
		const { getBudgetView } = await import("@/lib/budget");
		const account = seedAccount("Overspend Checking", 1_000_000_00);
		const { categoryId } = seedCategory("Overspend Group", "Dining");

		assign(categoryId, "2026-03", 5000);
		spend(account, categoryId, "2026-03-10", 8000); // overspent by 3000

		const mar = getBudgetView("2026-03");
		const marCat = mar.groups
			.flatMap((g) => g.categories)
			.find((c) => c.id === categoryId);
		expect(marCat?.available).toBe(-3000);

		const apr = getBudgetView("2026-04");
		const aprCat = apr.groups
			.flatMap((g) => g.categories)
			.find((c) => c.id === categoryId);
		expect(aprCat?.available).toBe(-3000); // still overspent, nothing assigned since
	});

	it("nets a deposit (refund) against activity instead of ignoring it", async () => {
		const { db, schema } = ctx;
		const { getBudgetView } = await import("@/lib/budget");
		const account = seedAccount("Refund Checking", 1_000_000_00);
		const { categoryId } = seedCategory("Refund Group", "Shopping");

		assign(categoryId, "2026-05", 10000);
		spend(account, categoryId, "2026-05-05", 8000);
		db.insert(schema.transactions)
			.values({
				id: randomUUID(),
				account_id: account,
				category_id: categoryId,
				deposit: 2000,
				date: "2026-05-06",
				status: "cleared",
			})
			.run();

		const may = getBudgetView("2026-05");
		const cat = may.groups
			.flatMap((g) => g.categories)
			.find((c) => c.id === categoryId);
		// activity = 8000 - 2000 = 6000; available = 10000 - 6000 = 4000
		expect(cat?.activity).toBe(6000);
		expect(cat?.available).toBe(4000);
	});

	it("excludes pending (unreviewed) transactions from activity", async () => {
		const { db, schema } = ctx;
		const { getBudgetView } = await import("@/lib/budget");
		const account = seedAccount("Pending Checking", 1_000_000_00);
		const { categoryId } = seedCategory("Pending Group", "Imported");

		assign(categoryId, "2026-06", 5000);
		db.insert(schema.transactions)
			.values({
				id: randomUUID(),
				account_id: account,
				category_id: categoryId,
				payment: 3000,
				date: "2026-06-10",
				status: "pending",
			})
			.run();

		const jun = getBudgetView("2026-06");
		const cat = jun.groups
			.flatMap((g) => g.categories)
			.find((c) => c.id === categoryId);
		expect(cat?.activity).toBe(0);
		expect(cat?.available).toBe(5000);
	});

	it("excludes income-group categories from the assignable groups", async () => {
		const { db, schema } = ctx;
		const { eq } = await import("drizzle-orm");
		const { getBudgetView } = await import("@/lib/budget");

		// The database seeds exactly one income group on first boot (enforced
		// by a unique index), with an "Income" category in it - use that
		// rather than creating a second income group.
		const incomeGroup = db
			.select({ id: schema.category_group.id })
			.from(schema.category_group)
			.where(eq(schema.category_group.is_income, true))
			.get();
		expect(incomeGroup).toBeDefined();

		const view = getBudgetView("2026-07");
		const hasIncomeGroup = view.groups.some((g) => g.is_income);
		expect(hasIncomeGroup).toBe(false);

		const incomeCategoryShowsUp = view.groups
			.flatMap((g) => g.categories)
			.some((c) => c.group_id === incomeGroup?.id);
		expect(incomeCategoryShowsUp).toBe(false);
	});

	it("'To Budget' subtracts every assignment ever made, not just the viewed month's", async () => {
		const { getBudgetView } = await import("@/lib/budget");
		const _account = seedAccount("ToBudget Checking", 100_000_00); // 100,000.00
		const { categoryId } = seedCategory("ToBudget Group", "Rent");

		assign(categoryId, "2026-08", 20000); // 200.00 assigned in August

		const aug = getBudgetView("2026-08");
		expect(aug.toBudget).toBe(aug.totalBalance - aug.totalAssignedAllTime);
		expect(aug.totalAssignedAllTime).toBeGreaterThanOrEqual(20000);

		// September: nothing new assigned, but August's assignment must still
		// count against toBudget - it must not be "available again".
		const sep = getBudgetView("2026-09");
		expect(sep.totalAssignedAllTime).toBe(aug.totalAssignedAllTime);
	});
});
