"use server";

import { z } from "zod";
import {
	createGoalRecord,
	deleteGoalRecord,
	setGoalAchieved,
	setGoalArchived,
	updateGoalRecord,
} from "@/lib/goal";
import { goalSchema } from "@/lib/goal-schema";
import { toCents } from "@/lib/money";
import { serverAction } from "@/lib/server-action";
import { id } from "@/lib/validation";

export const createGoal = serverAction(goalSchema, (values) => {
	createGoalRecord({
		name: values.name,
		targetAmount: toCents(values.targetAmount),
		targetMonth: values.targetMonth || null,
		categoryId: values.categoryId || null,
		notes: values.notes,
	});
	return { success: true, message: "Goal created." };
});

export const updateGoal = serverAction(
	goalSchema.extend({ id }),
	({ id, ...values }) => {
		updateGoalRecord(id, {
			name: values.name,
			targetAmount: toCents(values.targetAmount),
			targetMonth: values.targetMonth ?? "",
			notes: values.notes ?? "",
		});
		return { success: true, message: "Goal updated." };
	},
);

const toggle = z.object({ id, on: z.boolean() });

export const archiveGoal = serverAction(toggle, ({ id, on }) => {
	setGoalArchived(id, on);
});

export const markGoalAchieved = serverAction(toggle, ({ id, on }) => {
	setGoalAchieved(id, on);
});

export const deleteGoal = serverAction(id, (goalId) => {
	deleteGoalRecord(goalId);
	return {
		success: true,
		message: "Goal deleted. Its budget category was kept.",
	};
});
