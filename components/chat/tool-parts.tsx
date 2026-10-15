"use client";

import { getToolName, type ToolUIPart } from "ai";
import { Check, ChevronRight, Search, ShieldQuestion, X } from "lucide-react";
import { formatMonthLabel } from "@/components/goals/month-label";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import type { CoachTools } from "@/lib/ai/message-types";

type CoachToolPart = ToolUIPart<CoachTools>;
type Input = Record<string, unknown>;

const rupees = (value: unknown) =>
	typeof value === "number"
		? `PKR ${Math.round(value).toLocaleString("en-US")}`
		: "-";

const monthText = (value: unknown) =>
	typeof value === "string" ? formatMonthLabel(value) : "-";

function readToolLabel(
	name: string,
	input: Input,
): { active: string; done: string } {
	switch (name) {
		case "getBudgetMonth":
			return {
				active: `Checking your ${monthText(input.month)} budget…`,
				done: `Checked your ${monthText(input.month)} budget`,
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
			};
		}
		case "getCategoryTrend": {
			const category = String(input.category ?? "a category");
			const months = String(input.months ?? 6);
			return {
				active: `Checking ${category} over ${months} months…`,
				done: `Checked ${category} over ${months} months`,
			};
		}
		case "searchTransactions": {
			const category = input.category ? `${String(input.category)} ` : "";
			return input.query
				? {
						active: `Searching transactions for "${String(input.query)}"…`,
						done: `Searched transactions for "${String(input.query)}"`,
					}
				: {
						active: `Searching ${category}transactions…`,
						done: `Searched ${category}transactions`,
					};
		}
		case "getGoals":
			return {
				active: "Checking your savings goals…",
				done: "Checked your savings goals",
			};
		case "simulateSavings":
			return {
				active: "Running the savings numbers…",
				done: "Ran the savings numbers",
			};
		default:
			return { active: name, done: name };
	}
}

export function ToolActivity({ part }: { part: CoachToolPart }) {
	const name = getToolName(part);
	const input = (part.input ?? {}) as Input;
	const done = part.state === "output-available";
	const failed = part.state === "output-error";
	const label = readToolLabel(name, input);

	if (!done && !failed) {
		return <p className="shimmer text-sm">{label.active}</p>;
	}

	return (
		<Collapsible className="group not-typeset text-sm text-muted-foreground">
			<CollapsibleTrigger className="flex items-center gap-1.5 hover:text-foreground">
				{failed ? (
					<X className="h-3.5 w-3.5 text-destructive" />
				) : (
					<Search className="h-3.5 w-3.5" />
				)}
				<span>{label.done}</span>
				<ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-90" />
			</CollapsibleTrigger>
			<CollapsibleContent>
				{failed && <p className="mt-1 text-destructive">{part.errorText}</p>}
				{done && (
					<ScrollArea className="mt-2 h-64 rounded-md bg-muted">
						<pre className="p-3 text-xs">
							{JSON.stringify(part.output, null, 2)}
						</pre>
					</ScrollArea>
				)}
			</CollapsibleContent>
		</Collapsible>
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

function ApprovalStatus({
	part,
	name,
	onRespond,
}: {
	part: CoachToolPart;
	name: string;
	onRespond: (approvalId: string, approved: boolean) => void;
}) {
	switch (part.state) {
		case "input-streaming":
		case "input-available":
			return (
				<span className="flex items-center gap-1.5 text-muted-foreground">
					<Spinner className="size-3.5" /> Preparing…
				</span>
			);
		case "approval-requested":
			return (
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
		case "approval-responded":
			return part.approval.approved ? (
				<span className="flex items-center gap-1.5 text-muted-foreground">
					<Spinner className="size-3.5" /> Applying…
				</span>
			) : (
				<span className="text-muted-foreground">Cancelled.</span>
			);
		case "output-available": {
			const failed =
				(part.output as { ok?: boolean } | undefined)?.ok === false;
			return (
				<span
					className={
						failed
							? "text-destructive"
							: "flex items-center gap-1.5 text-emerald-500"
					}
				>
					{!failed && <Check className="h-3.5 w-3.5" />}
					{outcomeText(name, part.output)}
				</span>
			);
		}
		case "output-denied":
			return <span className="text-muted-foreground">Cancelled.</span>;
		case "output-error":
			return <span className="text-destructive">{part.errorText}</span>;
		default:
			return null;
	}
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
	const requestReason =
		"approval" in part ? part.approval?.requestReason : undefined;
	return (
		<div className="not-typeset max-w-md rounded-lg border bg-card p-4 text-sm">
			<p className="mb-3 flex items-center gap-2 font-medium">
				<ShieldQuestion className="h-4 w-4 text-sky-500" />
				{PROPOSAL_TITLES[name] ?? name}
			</p>
			{requestReason && (
				<p className="mb-2 text-muted-foreground">{requestReason}</p>
			)}
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
			<ApprovalStatus part={part} name={name} onRespond={onRespond} />
		</div>
	);
}
