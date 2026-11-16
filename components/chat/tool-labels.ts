import {
	Calculator,
	ChartPie,
	type LucideIcon,
	Search,
	Target,
	TrendingUp,
	Wallet,
	Wrench,
} from "lucide-react";
import { monthText, type ToolInput } from "./tool-format";

type ToolLabel = { active: string; done: string; icon: LucideIcon };

export function readToolLabel(name: string, input: ToolInput): ToolLabel {
	switch (name) {
		case "getBudgetMonth":
			return {
				active: `Checking your ${monthText(input.month)} budget…`,
				done: `Checked your ${monthText(input.month)} budget`,
				icon: Wallet,
			};
		case "getSpending": {
			const what =
				input.groupBy === "category"
					? "spending by category"
					: "monthly totals";
			const range = `${monthText(input.fromMonth)} to ${monthText(input.toMonth)}`;
			return {
				active: `Looking at ${what}, ${range}…`,
				done: `Looked at ${what}, ${range}`,
				icon: ChartPie,
			};
		}
		case "getCategoryTrend": {
			const category = String(input.category ?? "a category");
			const months = String(input.months ?? 6);
			return {
				active: `Checking ${category} over ${months} months…`,
				done: `Checked ${category} over ${months} months`,
				icon: TrendingUp,
			};
		}
		case "searchTransactions": {
			const category = input.category ? `${String(input.category)} ` : "";
			return input.query
				? {
						active: `Searching transactions for "${String(input.query)}"…`,
						done: `Searched transactions for "${String(input.query)}"`,
						icon: Search,
					}
				: {
						active: `Searching ${category}transactions…`,
						done: `Searched ${category}transactions`,
						icon: Search,
					};
		}
		case "getGoals":
			return {
				active: "Checking your savings goals…",
				done: "Checked your savings goals",
				icon: Target,
			};
		case "simulateSavings":
			return {
				active: "Running the savings numbers…",
				done: "Ran the savings numbers",
				icon: Calculator,
			};
		default:
			return { active: name, done: name, icon: Wrench };
	}
}
