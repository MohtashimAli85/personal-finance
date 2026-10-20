"use server";

import { z } from "zod";
import { copyBudgetFromMonth, getCategoryGoalName } from "@/lib/budget";
import * as amounts from "@/lib/budget-mutations";
import * as structure from "@/lib/budget-structure";
import { prevMonthKey } from "@/lib/date";
import { serverAction } from "@/lib/server-action";
import {
	cents,
	id,
	monthKey,
	optionalId,
	requiredText,
} from "@/lib/validation";

export const setBudgetedAmount = serverAction(
	z.object({ categoryId: id, month: monthKey, amount: cents }),
	({ categoryId, month, amount }) => {
		amounts.setBudgetedAmount(categoryId, month, amount);
	},
);

export const setCategoryCarryover = serverAction(
	z.object({ categoryId: id, month: monthKey, carryover: z.boolean() }),
	({ categoryId, month, carryover }) => {
		amounts.setCategoryCarryover(categoryId, month, carryover);
	},
);

export const transferBetweenCategories = serverAction(
	z.object({ fromId: id, toId: id, month: monthKey, amount: cents }),
	({ fromId, toId, month, amount }) => {
		amounts.transferBetweenCategories(fromId, toId, month, amount);
	},
);

export const holdForNextMonth = serverAction(
	z.object({ month: monthKey, amount: cents }),
	({ month, amount }) => ({
		success: true,
		payload: { buffered: amounts.holdForNextMonth(month, amount) },
	}),
);

export const resetHold = serverAction(monthKey, (month) => {
	amounts.resetHold(month);
});

/** Copies every category's assignment from the previous month into this one. */
export const copyPreviousMonthBudget = serverAction(monthKey, (month) => ({
	success: true,
	payload: { copied: copyBudgetFromMonth(prevMonthKey(month), month) },
}));

export const createBudgetGroup = serverAction(
	requiredText("Group name"),
	(name) => {
		structure.createBudgetGroup(name);
	},
);

export const renameBudgetGroup = serverAction(
	z.object({ groupId: id, name: requiredText("Group name") }),
	({ groupId, name }) => {
		structure.renameBudgetGroup(groupId, name);
	},
);

export const deleteBudgetGroup = serverAction(id, (groupId) => {
	structure.deleteBudgetGroup(groupId);
});

export const reorderBudgetGroups = serverAction(
	z.array(id).min(1),
	(groupIds) => {
		structure.reorderBudgetGroups(groupIds);
	},
);

export const createBudgetCategory = serverAction(
	z.object({ groupId: id, name: requiredText("Category name") }),
	({ groupId, name }) => {
		structure.createBudgetCategory(groupId, name);
	},
);

export const renameBudgetCategory = serverAction(
	z.object({ categoryId: id, name: requiredText("Category name") }),
	({ categoryId, name }) => {
		structure.renameBudgetCategory(categoryId, name);
	},
);

export const deleteBudgetCategory = serverAction(
	z.object({ categoryId: id, transferToId: optionalId }),
	({ categoryId, transferToId }) => {
		structure.deleteBudgetCategory(categoryId, transferToId);
	},
);

export async function getCategoryGoal(categoryId: string) {
	return getCategoryGoalName(id.parse(categoryId));
}
