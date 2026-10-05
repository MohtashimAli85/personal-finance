"use server";

import { revalidatePath } from "next/cache";
import {
	createGoalRecord,
	deleteGoalRecord,
	GoalError,
	setGoalAchieved,
	setGoalArchived,
	updateGoalRecord,
} from "@/lib/goal";
import { type GoalInput, goalSchema } from "@/lib/goal-schema";
import { toCents } from "@/lib/money";

const revalidateGoals = () => {
	revalidatePath("/goals");
	revalidatePath("/budget");
	revalidatePath("/");
};

function fieldErrors(input: GoalInput): ActionState | null {
	const parsed = goalSchema.safeParse(input);
	if (parsed.success) return null;
	const errors: ActionState["errors"] = {};
	for (const issue of parsed.error.issues) {
		const key = String(issue.path[0] ?? "form");
		errors[key] ??= { message: issue.message };
	}
	return { success: false, errors };
}

const failure = (error: unknown): ActionState => {
	if (error instanceof GoalError)
		return { success: false, message: error.message };
	throw error;
};

export async function createGoal(
	_prev: ActionState,
	input: GoalInput,
): Promise<ActionState> {
	const invalid = fieldErrors(input);
	if (invalid) return invalid;
	const values = goalSchema.parse(input);
	try {
		createGoalRecord({
			name: values.name,
			targetAmount: toCents(values.targetAmount),
			targetMonth: values.targetMonth || null,
			categoryId: values.categoryId || null,
			notes: values.notes,
		});
	} catch (error) {
		return failure(error);
	}
	revalidateGoals();
	return { success: true, message: "Goal created." };
}

export async function updateGoal(
	id: string,
	input: GoalInput,
): Promise<ActionState> {
	const invalid = fieldErrors(input);
	if (invalid) return invalid;
	const values = goalSchema.parse(input);
	try {
		updateGoalRecord(id, {
			name: values.name,
			targetAmount: toCents(values.targetAmount),
			targetMonth: values.targetMonth ?? "",
			notes: values.notes ?? "",
		});
	} catch (error) {
		return failure(error);
	}
	revalidateGoals();
	return { success: true, message: "Goal updated." };
}

export async function archiveGoal(
	id: string,
	archived: boolean,
): Promise<ActionState> {
	try {
		setGoalArchived(id, archived);
	} catch (error) {
		return failure(error);
	}
	revalidateGoals();
	return { success: true };
}

export async function markGoalAchieved(
	id: string,
	achieved: boolean,
): Promise<ActionState> {
	try {
		setGoalAchieved(id, achieved);
	} catch (error) {
		return failure(error);
	}
	revalidateGoals();
	return { success: true };
}

export async function deleteGoal(id: string): Promise<ActionState> {
	deleteGoalRecord(id);
	revalidateGoals();
	return {
		success: true,
		message: "Goal deleted. Its budget category was kept.",
	};
}
