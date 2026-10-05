"use client";

import { MoreHorizontal } from "lucide-react";
import { useState, useTransition } from "react";
import {
	archiveGoal,
	deleteGoal,
	markGoalAchieved,
} from "@/app/actions/goals/mutations";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GoalStatus, GoalView } from "@/lib/goal";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/tailwindcss/utils";
import GoalDialog from "./goal-dialog";
import { formatMonthLabel } from "./month-label";

const STATUS_META: Record<
	GoalStatus,
	{ label: string; className: string; bar: string }
> = {
	funded: {
		label: "Funded",
		className: "bg-emerald-500/15 text-emerald-500",
		bar: "bg-emerald-500",
	},
	on_track: {
		label: "On track",
		className: "bg-sky-500/15 text-sky-500",
		bar: "bg-sky-500",
	},
	behind: {
		label: "Behind",
		className: "bg-amber-500/15 text-amber-500",
		bar: "bg-amber-500",
	},
	overdue: {
		label: "Past target date",
		className: "bg-destructive/15 text-destructive",
		bar: "bg-destructive",
	},
	no_deadline: {
		label: "No deadline",
		className: "bg-muted text-muted-foreground",
		bar: "bg-primary",
	},
};

export default function GoalCard({ goal }: { goal: GoalView }) {
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [isPending, startTransition] = useTransition();
	const meta = STATUS_META[goal.status];
	const inactive = Boolean(goal.archivedAt || goal.achievedAt);

	const run = (action: () => Promise<ActionState>) =>
		startTransition(async () => {
			await action();
		});

	return (
		<Card className={cn(inactive && "opacity-70")}>
			<CardHeader>
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0">
						<CardTitle className="truncate text-base">{goal.name}</CardTitle>
						<p className="text-sm text-muted-foreground">
							{goal.targetMonth
								? `by ${formatMonthLabel(goal.targetMonth)}`
								: "No target date"}
							{goal.categoryName !== goal.name &&
								` · category "${goal.categoryName}"`}
						</p>
					</div>
					<div className="flex items-center gap-1">
						{goal.achievedAt ? (
							<Badge className="bg-emerald-500/15 text-emerald-500">
								Achieved
							</Badge>
						) : goal.archivedAt ? (
							<Badge variant="outline">Archived</Badge>
						) : (
							<Badge className={meta.className}>{meta.label}</Badge>
						)}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon-sm"
									disabled={isPending}
									aria-label="Goal actions"
								>
									<MoreHorizontal />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<GoalDialog
									goal={goal}
									trigger={
										<DropdownMenuItem
											onSelect={(event) => event.preventDefault()}
										>
											Edit
										</DropdownMenuItem>
									}
								/>
								<DropdownMenuItem
									onSelect={() =>
										run(() => markGoalAchieved(goal.id, !goal.achievedAt))
									}
								>
									{goal.achievedAt ? "Mark as not achieved" : "Mark achieved"}
								</DropdownMenuItem>
								<DropdownMenuItem
									onSelect={() =>
										run(() => archiveGoal(goal.id, !goal.archivedAt))
									}
								>
									{goal.archivedAt ? "Unarchive" : "Archive"}
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									variant="destructive"
									onSelect={() => setConfirmDelete(true)}
								>
									Delete
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex items-baseline justify-between gap-2">
					<span className="text-2xl font-semibold" data-money>
						{formatMoney(goal.saved)}
					</span>
					<span className="text-sm text-muted-foreground">
						of <span data-money>{formatMoney(goal.targetAmount)}</span>
					</span>
				</div>
				<div
					className="h-2 w-full overflow-hidden rounded-full bg-muted"
					role="progressbar"
					aria-valuenow={Math.round(goal.percent)}
					aria-valuemin={0}
					aria-valuemax={100}
				>
					<div
						className={cn("h-full rounded-full transition-all", meta.bar)}
						style={{ width: `${goal.percent}%` }}
					/>
				</div>
				<div className="grid grid-cols-2 gap-2 text-sm">
					<div>
						<p className="text-muted-foreground">Still needed</p>
						<p data-money>{formatMoney(goal.remaining)}</p>
					</div>
					<div>
						<p className="text-muted-foreground">
							{goal.requiredPerMonth !== null
								? `Per month (${goal.monthsLeft} left)`
								: "Budgeted this month"}
						</p>
						<p data-money>
							{goal.requiredPerMonth !== null
								? formatMoney(goal.requiredPerMonth)
								: formatMoney(goal.budgetedThisMonth)}
						</p>
					</div>
				</div>
				{goal.status === "behind" && !inactive && (
					<p className="text-sm text-amber-500">
						Budgeted{" "}
						<span data-money>{formatMoney(goal.budgetedThisMonth)}</span> this
						month - budget{" "}
						<span data-money>
							{formatMoney(
								(goal.requiredPerMonth ?? 0) - goal.budgetedThisMonth,
							)}
						</span>{" "}
						more into &quot;{goal.categoryName}&quot; to stay on track.
					</p>
				)}
				{goal.notes && (
					<p className="text-sm text-muted-foreground">{goal.notes}</p>
				)}
			</CardContent>

			<AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete &quot;{goal.name}&quot;?</AlertDialogTitle>
						<AlertDialogDescription>
							The goal is removed but its budget category &quot;
							{goal.categoryName}&quot; and any money in it stay in your budget.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={() => run(() => deleteGoal(goal.id))}>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	);
}
