import Link from "next/link";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { GoalView } from "@/lib/goal";
import { formatCurrency } from "@/lib/helper";

export default function GoalsCard({ goals }: { goals: GoalView[] }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Savings goals</CardTitle>
				<CardAction>
					<Link
						href="/goals"
						className="text-sm text-muted-foreground hover:text-foreground"
					>
						View all
					</Link>
				</CardAction>
			</CardHeader>
			<CardContent className="grid gap-4 md:grid-cols-2">
				{goals.map((goal) => (
					<div key={goal.id} className="flex flex-col gap-1.5">
						<div className="flex items-baseline justify-between gap-2">
							<span className="truncate font-medium">{goal.name}</span>
							<span
								data-money
								className="text-xs text-muted-foreground tabular-nums"
							>
								{formatCurrency(goal.saved)} /{" "}
								{formatCurrency(goal.targetAmount)}
							</span>
						</div>
						<Progress value={goal.percent} className="h-1.5" />
					</div>
				))}
			</CardContent>
		</Card>
	);
}
