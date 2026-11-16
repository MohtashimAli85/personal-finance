import { monthText, rupees, type ToolInput } from "./tool-format";

type Row = { label: string; value: string; money?: boolean };

export const PROPOSAL_TITLES: Record<string, string> = {
	createSavingsGoal: "Create a savings goal",
	updateSavingsGoal: "Update a savings goal",
	setBudgetAmount: "Change a budget amount",
};

const optional = (condition: unknown, row: Row): Row[] =>
	condition ? [row] : [];

export function proposalRows(name: string, input: ToolInput): Row[] {
	switch (name) {
		case "createSavingsGoal":
			return [
				{ label: "Goal", value: String(input.name ?? "-") },
				{ label: "Target", value: rupees(input.targetAmount), money: true },
				{
					label: "By",
					value: input.targetMonth
						? monthText(input.targetMonth)
						: "No deadline",
				},
				{
					label: "Budget category",
					value: input.linkCategory
						? String(input.linkCategory)
						: "New category in Savings Goals",
				},
				...optional(input.notes, {
					label: "Notes",
					value: String(input.notes),
				}),
			];
		case "updateSavingsGoal":
			return [
				...optional(input.name, {
					label: "New name",
					value: String(input.name),
				}),
				...optional(input.targetAmount !== undefined, {
					label: "Target",
					value: rupees(input.targetAmount),
					money: true,
				}),
				...optional(input.targetMonth, {
					label: "By",
					value: monthText(input.targetMonth),
				}),
				...optional(input.notes, {
					label: "Notes",
					value: String(input.notes),
				}),
			];
		case "setBudgetAmount":
			return [
				{ label: "Category", value: String(input.category ?? "-") },
				{ label: "Month", value: monthText(input.month) },
				{
					label: "Budgeted amount",
					value: rupees(input.amount),
					money: true,
				},
			];
		default:
			return [];
	}
}

export function outcomeText(name: string, output: unknown): string {
	const result = output as { ok?: boolean; error?: string } | undefined;
	if (result && result.ok === false) return result.error ?? "It didn't work.";
	if (name === "createSavingsGoal") return "Goal created.";
	if (name === "updateSavingsGoal") return "Goal updated.";
	return "Budget updated.";
}
