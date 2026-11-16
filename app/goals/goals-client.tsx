"use client";

import { Plus, Target } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import GoalCard from "@/components/goals/goal-card";
import GoalDialog, {
	type LinkableCategory,
} from "@/components/goals/goal-dialog";
import { Money } from "@/components/money";
import PageContainer from "@/components/page-container";
import PageFigure from "@/components/page-figure";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import type { GoalView } from "@/lib/goal";

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
		<PageContainer className="max-w-5xl">
			<PageHeader
				title="Goals"
				description={
					<>
						Each goal is a category on your{" "}
						<Link href="/budget" className="underline underline-offset-4">
							budget
						</Link>
						. Budget money into it every month to save toward the target.
					</>
				}
				figures={
					active.length > 0 && (
						<>
							<PageFigure label="Saved">
								<Money value={totalSaved} />
							</PageFigure>
							<PageFigure label="Targets">
								<Money value={totalTarget} />
							</PageFigure>
							<PageFigure label="Needed per month">
								<Money value={monthlyNeed} />
							</PageFigure>
						</>
					)
				}
			>
				{newGoalButton}
			</PageHeader>

			{active.length === 0 ? (
				<Empty className="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Target />
						</EmptyMedia>
						<EmptyTitle>No active goals</EmptyTitle>
						<EmptyDescription>
							Saving for a laptop, a trip or an emergency fund? Create a goal,
							or ask the AI coach to plan one with you.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>{newGoalButton}</EmptyContent>
				</Empty>
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
						aria-expanded={showInactive}
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
		</PageContainer>
	);
}
