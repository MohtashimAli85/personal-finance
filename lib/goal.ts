import { asc, eq, isNull, sql } from "drizzle-orm";
import { cache } from "react";
import { getBudgetView } from "@/lib/budget";
import { getMonthKey, isMonthKey, monthsBetween } from "@/lib/date";
import { db } from "@/lib/db";
import { categories, category_group, goals } from "@/lib/db/schema";

export const SAVINGS_GROUP_NAME = "Savings Goals";

export type GoalStatus =
	| "funded"
	| "on_track"
	| "behind"
	| "overdue"
	| "no_deadline";

export interface GoalProgress {
	saved: number;
	remaining: number;
	percent: number;
	monthsLeft: number | null;
	requiredPerMonth: number | null;
	budgetedThisMonth: number;
	status: GoalStatus;
}

export interface GoalView extends GoalProgress {
	id: string;
	name: string;
	targetAmount: number;
	targetMonth: string | null;
	categoryId: string;
	categoryName: string;
	notes: string | null;
	createdAt: string | null;
	achievedAt: string | null;
	archivedAt: string | null;
}

export function computeGoalProgress(input: {
	targetAmount: number;
	available: number;
	budgetedThisMonth: number;
	targetMonth: string | null;
	currentMonth: string;
}): GoalProgress {
	const { targetAmount, available, budgetedThisMonth, targetMonth } = input;
	const saved = available;
	const remaining = Math.max(targetAmount - saved, 0);
	const percent =
		targetAmount > 0
			? Math.min(Math.max((saved / targetAmount) * 100, 0), 100)
			: 0;

	const monthsLeft =
		targetMonth && isMonthKey(targetMonth)
			? targetMonth >= input.currentMonth
				? monthsBetween(input.currentMonth, targetMonth).length
				: 0
			: null;

	const savedBeforeThisMonth = available - budgetedThisMonth;
	const requiredPerMonth =
		monthsLeft && monthsLeft > 0
			? Math.ceil(Math.max(targetAmount - savedBeforeThisMonth, 0) / monthsLeft)
			: null;

	let status: GoalStatus;
	if (saved >= targetAmount) status = "funded";
	else if (monthsLeft === null) status = "no_deadline";
	else if (monthsLeft === 0) status = "overdue";
	else if (budgetedThisMonth >= (requiredPerMonth ?? 0)) status = "on_track";
	else status = "behind";

	return {
		saved,
		remaining,
		percent,
		monthsLeft,
		requiredPerMonth,
		budgetedThisMonth,
		status,
	};
}

export const getGoals = cache(
	(
		options: {
			includeArchived?: boolean;
			month?: string;
			budget?: BudgetView;
		} = {},
	): GoalView[] => {
		const month = options.month ?? getMonthKey();
		const rows = db
			.select({
				id: goals.id,
				name: goals.name,
				targetAmount: goals.target_amount,
				targetMonth: goals.target_month,
				categoryId: goals.category_id,
				categoryName: categories.name,
				notes: goals.notes,
				createdAt: goals.created_at,
				achievedAt: goals.achieved_at,
				archivedAt: goals.archived_at,
			})
			.from(goals)
			.innerJoin(categories, eq(goals.category_id, categories.id))
			.where(options.includeArchived ? undefined : isNull(goals.archived_at))
			.orderBy(asc(goals.target_month), asc(goals.created_at))
			.all();

		if (rows.length === 0) return [];

		const envelopes = new Map<string, { balance: number; budgeted: number }>();
		for (const group of (options.budget ?? getBudgetView(month)).groups) {
			for (const category of group.categories) {
				envelopes.set(category.id, {
					balance: category.balance,
					budgeted: category.budgeted,
				});
			}
		}

		return rows.map((row) => {
			const envelope = envelopes.get(row.categoryId);
			return {
				...row,
				...computeGoalProgress({
					targetAmount: row.targetAmount,
					available: envelope?.balance ?? 0,
					budgetedThisMonth: envelope?.budgeted ?? 0,
					targetMonth: row.targetMonth,
					currentMonth: month,
				}),
			};
		});
	},
);

export class GoalError extends Error {}

function ensureSavingsGroup(): string {
	const existing = db
		.select({ id: category_group.id })
		.from(category_group)
		.where(eq(category_group.name, SAVINGS_GROUP_NAME))
		.get();
	if (existing) return existing.id;

	const maxSort =
		db
			.select({
				max: sql<number>`coalesce(max(${category_group.sort_order}), 0)`,
			})
			.from(category_group)
			.where(eq(category_group.is_income, false))
			.get()?.max ?? 0;
	const id = crypto.randomUUID();
	db.insert(category_group)
		.values({ id, name: SAVINGS_GROUP_NAME, sort_order: maxSort + 1 })
		.run();
	return id;
}

function findCategoryByName(name: string) {
	return db
		.select({ id: categories.id })
		.from(categories)
		.where(sql`lower(${categories.name}) = lower(${name})`)
		.get();
}

function assertLinkableCategory(categoryId: string) {
	const category = db
		.select({ id: categories.id, isIncome: category_group.is_income })
		.from(categories)
		.leftJoin(category_group, eq(categories.group_id, category_group.id))
		.where(eq(categories.id, categoryId))
		.get();
	if (!category) throw new GoalError("Category not found.");
	if (category.isIncome) {
		throw new GoalError("An income category can't back a savings goal.");
	}
	const linked = db
		.select({ id: goals.id })
		.from(goals)
		.where(eq(goals.category_id, categoryId))
		.get();
	if (linked) {
		throw new GoalError("That category already backs another goal.");
	}
}

export interface GoalRecordInput {
	name: string;
	targetAmount: number;
	targetMonth?: string | null;
	categoryId?: string | null;
	notes?: string | null;
}

export function createGoalRecord(input: GoalRecordInput): string {
	const name = input.name.trim();
	if (!name) throw new GoalError("Goal name is required.");
	if (!(input.targetAmount > 0)) {
		throw new GoalError("Target must be more than 0.");
	}
	if (input.targetMonth && !isMonthKey(input.targetMonth)) {
		throw new GoalError("Target month must be YYYY-MM.");
	}

	return db.transaction(() => {
		let categoryId = input.categoryId ?? null;
		if (categoryId) {
			assertLinkableCategory(categoryId);
		} else {
			if (findCategoryByName(name)) {
				throw new GoalError(
					`A category named "${name}" already exists. Link it to the goal instead.`,
				);
			}
			const groupId = ensureSavingsGroup();
			const maxSort =
				db
					.select({
						max: sql<number>`coalesce(max(${categories.sort_order}), 0)`,
					})
					.from(categories)
					.where(eq(categories.group_id, groupId))
					.get()?.max ?? 0;
			categoryId = crypto.randomUUID();
			db.insert(categories)
				.values({
					id: categoryId,
					name,
					group_id: groupId,
					sort_order: maxSort + 1,
				})
				.run();
		}

		const id = crypto.randomUUID();
		db.insert(goals)
			.values({
				id,
				name,
				target_amount: input.targetAmount,
				target_month: input.targetMonth || null,
				category_id: categoryId,
				notes: input.notes?.trim() || null,
			})
			.run();
		return id;
	});
}

function requireGoal(id: string) {
	const goal = db.select().from(goals).where(eq(goals.id, id)).get();
	if (!goal) throw new GoalError("Goal not found.");
	return goal;
}

export function updateGoalRecord(
	id: string,
	input: Partial<Omit<GoalRecordInput, "categoryId">>,
) {
	const goal = requireGoal(id);
	if (input.targetAmount !== undefined && !(input.targetAmount > 0)) {
		throw new GoalError("Target must be more than 0.");
	}
	if (input.targetMonth && !isMonthKey(input.targetMonth)) {
		throw new GoalError("Target month must be YYYY-MM.");
	}
	const nextName = input.name?.trim();

	db.transaction(() => {
		db.update(goals)
			.set({
				...(nextName ? { name: nextName } : {}),
				...(input.targetAmount !== undefined
					? { target_amount: input.targetAmount }
					: {}),
				...(input.targetMonth !== undefined
					? { target_month: input.targetMonth || null }
					: {}),
				...(input.notes !== undefined
					? { notes: input.notes?.trim() || null }
					: {}),
			})
			.where(eq(goals.id, id))
			.run();

		if (nextName && nextName !== goal.name) {
			const category = db
				.select({ name: categories.name })
				.from(categories)
				.where(eq(categories.id, goal.category_id))
				.get();
			const clash = findCategoryByName(nextName);
			if (category?.name === goal.name && !clash) {
				db.update(categories)
					.set({ name: nextName })
					.where(eq(categories.id, goal.category_id))
					.run();
			}
		}
	});
}

export function setGoalArchived(id: string, archived: boolean) {
	requireGoal(id);
	db.update(goals)
		.set({ archived_at: archived ? sql`(datetime('now'))` : null })
		.where(eq(goals.id, id))
		.run();
}

export function setGoalAchieved(id: string, achieved: boolean) {
	requireGoal(id);
	db.update(goals)
		.set({ achieved_at: achieved ? sql`(datetime('now'))` : null })
		.where(eq(goals.id, id))
		.run();
}

export function deleteGoalRecord(id: string) {
	db.delete(goals).where(eq(goals.id, id)).run();
}
