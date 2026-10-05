import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { monthly_budgets } from "@/lib/db/schema";
import { getGoals } from "@/lib/goal";
import { fromCents } from "@/lib/money";
import { resolveCategory } from "./finance-data";
import type { WriteToolName } from "./tool-names";

const processSecret = crypto.randomBytes(32);

export function toolApprovalSecret(): Uint8Array {
	const appSecret = process.env.APP_SECRET_KEY;
	if (!appSecret) return processSecret;
	return crypto
		.createHmac("sha256", appSecret)
		.update("tool-approval")
		.digest();
}

const rupees = (cents: number) =>
	`PKR ${Math.round(fromCents(cents)).toLocaleString("en-US")}`;

export function describeGoalUpdate(goalId: string): string {
	const goal = getGoals({ includeArchived: true }).find((g) => g.id === goalId);
	if (!goal) return "This goal doesn't exist, so the change will fail.";
	const deadline = goal.targetMonth ? ` by ${goal.targetMonth}` : "";
	return `Changes "${goal.name}" (currently ${rupees(goal.targetAmount)}${deadline}).`;
}

export function describeBudgetChange(category: string, month: string): string {
	const ref = resolveCategory(category);
	if (!ref) return `There is no category named "${category}".`;
	const current =
		db
			.select({ amount: monthly_budgets.amount })
			.from(monthly_budgets)
			.where(
				and(
					eq(monthly_budgets.category_id, ref.id),
					eq(monthly_budgets.month, month),
				),
			)
			.get()?.amount ?? 0;
	const label = ref.group ? `${ref.group} / ${ref.name}` : ref.name;
	return `${label} currently has ${rupees(current)} budgeted for ${month}.`;
}

export function writeToolApproval() {
	return {
		createSavingsGoal: "user-approval",
		updateSavingsGoal: (input: { goalId: string }) => ({
			type: "user-approval" as const,
			reason: describeGoalUpdate(input.goalId),
		}),
		setBudgetAmount: (input: { category: string; month: string }) => ({
			type: "user-approval" as const,
			reason: describeBudgetChange(input.category, input.month),
		}),
	} as const satisfies Record<WriteToolName, unknown>;
}
