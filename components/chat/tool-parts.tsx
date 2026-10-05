"use client";

import { getToolName, type ToolUIPart } from "ai";
import {
	Check,
	ChevronRight,
	Loader2,
	Search,
	ShieldQuestion,
	X,
} from "lucide-react";
import { formatMonthLabel } from "@/components/goals/month-label";
import { Button } from "@/components/ui/button";
import type { CoachTools } from "@/lib/ai/message-types";

type CoachToolPart = ToolUIPart<CoachTools>;
type Input = Record<string, unknown>;

const rupees = (value: unknown) =>
	typeof value === "number"
		? `PKR ${Math.round(value).toLocaleString("en-US")}`
		: "-";

const monthText = (value: unknown) =>
	typeof value === "string" ? formatMonthLabel(value) : "-";

export const WRITE_TOOLS = new Set([
	"createSavingsGoal",
	"updateSavingsGoal",
	"setBudgetAmount",
]);

function readToolLabel(name: string, input: Input): string {
	switch (name) {
		case "getBudgetMonth":
			return `Checked your ${monthText(input.month)} budget`;
		case "getSpending":
			return `Looked at ${input.groupBy === "category" ? "spending by category" : "monthly totals"}, ${monthText(input.fromMonth)} to ${monthText(input.toMonth)}`;
		case "getCategoryTrend":
			return `Checked ${String(input.category ?? "a category")} over ${String(input.months ?? 6)} months`;
		case "searchTransactions":
			return input.query
				? `Searched transactions for "${String(input.query)}"`
				: `Searched ${input.category ? `${String(input.category)} ` : ""}transactions`;
		case "getGoals":
			return "Checked your savings goals";
		case "simulateSavings":
			return "Ran the savings numbers";
		default:
			return name;
	}
}

export function ToolActivity({ part }: { part: CoachToolPart }) {
	const name = getToolName(part);
	const input = (part.input ?? {}) as Input;
	const done = part.state === "output-available";
	const failed = part.state === "output-error";

	return (
		<details className="group not-typeset text-sm text-muted-foreground">
			<summary className="flex cursor-pointer list-none items-center gap-1.5 hover:text-foreground">
				{done ? (
					<Search className="h-3.5 w-3.5" />
				) : failed ? (
					<X className="h-3.5 w-3.5 text-destructive" />
				) : (
					<Loader2 className="h-3.5 w-3.5 animate-spin" />
				)}
				<span>{readToolLabel(name, input)}</span>
				{(done || failed) && (
					<ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
				)}
			</summary>
			{failed && <p className="mt-1 text-destructive">{part.errorText}</p>}
			{done && (
				<pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
					{JSON.stringify(part.output, null, 2)}
				</pre>
			)}
		</details>
	);
}

function proposalRows(name: string, input: Input): [string, string][] {
	switch (name) {
		case "createSavingsGoal":
			return [
				["Goal", String(input.name ?? "-")],
				["Target", rupees(input.targetAmount)],
				[
					"By",
					input.targetMonth ? monthText(input.targetMonth) : "No deadline",
				],
				[
					"Budget category",
					input.linkCategory
						? String(input.linkCategory)
						: "New category in Savings Goals",
				],
				...(input.notes
					? [["Notes", String(input.notes)] as [string, string]]
					: []),
			];
		case "updateSavingsGoal":
			return [
				...(input.name
					? [["New name", String(input.name)] as [string, string]]
					: []),
				...(input.targetAmount !== undefined
					? [["Target", rupees(input.targetAmount)] as [string, string]]
					: []),
				...(input.targetMonth
					? [["By", monthText(input.targetMonth)] as [string, string]]
					: []),
				...(input.notes
					? [["Notes", String(input.notes)] as [string, string]]
					: []),
			];
		case "setBudgetAmount":
			return [
				["Category", String(input.category ?? "-")],
				["Month", monthText(input.month)],
				["Budgeted amount", rupees(input.amount)],
			];
		default:
			return [];
	}
}

const PROPOSAL_TITLES: Record<string, string> = {
	createSavingsGoal: "Create a savings goal",
	updateSavingsGoal: "Update a savings goal",
	setBudgetAmount: "Change a budget amount",
};

function outcomeText(name: string, output: unknown): string {
	const result = output as { ok?: boolean; error?: string } | undefined;
	if (result && result.ok === false) return result.error ?? "It didn't work.";
	if (name === "createSavingsGoal") return "Goal created.";
	if (name === "updateSavingsGoal") return "Goal updated.";
	return "Budget updated.";
}

export function ApprovalCard({
	part,
	onRespond,
}: {
	part: CoachToolPart;
	onRespond: (approvalId: string, approved: boolean) => void;
}) {
	const name = getToolName(part);
	const rows = proposalRows(name, (part.input ?? {}) as Input);
	const failedOutput =
		part.state === "output-available" &&
		(part.output as { ok?: boolean } | undefined)?.ok === false;

	let status: React.ReactNode = null;
	switch (part.state) {
		case "input-streaming":
		case "input-available":
			status = (
				<span className="flex items-center gap-1.5 text-muted-foreground">
					<Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing…
				</span>
			);
			break;
		case "approval-requested":
			status = (
				<div className="flex gap-2">
					<Button size="sm" onClick={() => onRespond(part.approval.id, true)}>
						<Check /> Confirm
					</Button>
					<Button
						size="sm"
						variant="outline"
						onClick={() => onRespond(part.approval.id, false)}
					>
						Cancel
					</Button>
				</div>
			);
			break;
		case "approval-responded":
			status = part.approval.approved ? (
				<span className="flex items-center gap-1.5 text-muted-foreground">
					<Loader2 className="h-3.5 w-3.5 animate-spin" /> Applying…
				</span>
			) : (
				<span className="text-muted-foreground">Cancelled.</span>
			);
			break;
		case "output-available":
			status = (
				<span
					className={
						failedOutput
							? "text-destructive"
							: "flex items-center gap-1.5 text-emerald-500"
					}
				>
					{!failedOutput && <Check className="h-3.5 w-3.5" />}
					{outcomeText(name, part.output)}
				</span>
			);
			break;
		case "output-denied":
			status = <span className="text-muted-foreground">Cancelled.</span>;
			break;
		case "output-error":
			status = <span className="text-destructive">{part.errorText}</span>;
			break;
	}

	return (
		<div className="not-typeset max-w-md rounded-lg border bg-card p-4 text-sm">
			<p className="mb-3 flex items-center gap-2 font-medium">
				<ShieldQuestion className="h-4 w-4 text-sky-500" />
				{PROPOSAL_TITLES[name] ?? name}
			</p>
			<dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
				{rows.map(([label, value]) => (
					<div key={label} className="contents">
						<dt className="text-muted-foreground">{label}</dt>
						<dd
							data-money={
								label === "Target" || label === "Budgeted amount"
									? ""
									: undefined
							}
						>
							{value}
						</dd>
					</div>
				))}
			</dl>
			{status}
		</div>
	);
}
