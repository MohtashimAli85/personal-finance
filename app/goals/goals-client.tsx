"use client";

import { PiggyBank, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import GoalCard from "@/components/goals/goal-card";
import GoalDialog, {
	type LinkableCategory,
} from "@/components/goals/goal-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { GoalView } from "@/lib/goal";
import { formatMoney } from "@/lib/money";

export default function GoalsClient({
	goals,
	linkableCategories,
}: {
	goals: GoalView[];
	linkableCategories: LinkableCategory[];
}) {
	const [showInactive, setShowInactive] = useState(false);
	const active = goals.filter((goal) => !goal.archivedAt && !goal.achievedAt);
	const inactive = goals.filter((goal) => goal.archivedAt || goal.achievedAt);
	const totalSaved = active.reduce(
		(sum, goal) => sum + Math.max(goal.saved, 0),
		0,
	);
	const totalTarget = active.reduce((sum, goal) => sum + goal.targetAmount, 0);
	const monthlyNeed = active.reduce(
		(sum, goal) =>
			sum + (goal.status === "funded" ? 0 : (goal.requiredPerMonth ?? 0)),
		0,
	);

	const newGoalButton = (
		<GoalDialog
			linkableCategories={linkableCategories}
			trigger={
				<Button>
					<Plus /> New goal
				</Button>
			}
		/>
	);

	return (
		<div className="max-w-5xl w-full mx-auto p-6 space-y-6 overflow-auto">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<h1 className="text-2xl font-bold">Savings Goals</h1>
					<p className="text-sm text-muted-foreground">
						Each goal is a category on your{" "}
						<Link href="/budget" className="underline underline-offset-4">
							budget
						</Link>
						. Budget money into it every month to save toward the target.
					</p>
				</div>
				{newGoalButton}
			</div>

			{active.length > 0 && (
				<div className="grid gap-4 sm:grid-cols-3">
					<Card>
						<CardContent>
							<p className="text-sm text-muted-foreground">Saved so far</p>
							<p className="text-xl font-semibold" data-money>
								{formatMoney(totalSaved)}
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardContent>
							<p className="text-sm text-muted-foreground">Total targets</p>
							<p className="text-xl font-semibold" data-money>
								{formatMoney(totalTarget)}
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardContent>
							<p className="text-sm text-muted-foreground">Needed per month</p>
							<p className="text-xl font-semibold" data-money>
								{formatMoney(monthlyNeed)}
							</p>
						</CardContent>
					</Card>
				</div>
			)}

			{active.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center gap-3 py-10 text-center">
						<PiggyBank className="h-10 w-10 text-muted-foreground" />
						<div>
							<p className="font-medium">No active goals</p>
							<p className="text-sm text-muted-foreground">
								Saving for a laptop, a trip or an emergency fund? Create a goal,
								or ask the AI coach to plan one with you.
							</p>
						</div>
						{newGoalButton}
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2">
					{active.map((goal) => (
						<GoalCard key={goal.id} goal={goal} />
					))}
				</div>
			)}

			{inactive.length > 0 && (
				<div className="space-y-4">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setShowInactive((value) => !value)}
					>
						{showInactive ? "Hide" : "Show"} achieved and archived (
						{inactive.length})
					</Button>
					{showInactive && (
						<div className="grid gap-4 md:grid-cols-2">
							{inactive.map((goal) => (
								<GoalCard key={goal.id} goal={goal} />
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
