"use client";

import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCompactMoney, fromCents } from "@/lib/money";
import ChartEmpty from "./chart-empty";

const config = {
	spent: { label: "Spent", color: "var(--series-2)" },
} satisfies ChartConfig;

export default function SpendingByGroupChart({
	data,
}: {
	data: { name: string; spent: number }[];
}) {
	const points = data
		.slice(0, 6)
		.map((d) => ({ name: d.name, spent: fromCents(d.spent) }));

	if (points.length === 0) {
		return <ChartEmpty>No spending yet this month.</ChartEmpty>;
	}

	return (
		<ChartContainer
			config={config}
			className="aspect-auto h-56 w-full"
			data-category-axis
		>
			<BarChart data={points} layout="vertical" margin={{ right: 48 }}>
				<XAxis type="number" dataKey="spent" hide />
				<YAxis
					type="category"
					dataKey="name"
					width={130}
					tickLine={false}
					axisLine={false}
				/>
				<ChartTooltip
					cursor={false}
					content={<ChartTooltipContent hideLabel />}
				/>
				<Bar
					isAnimationActive={false}
					dataKey="spent"
					fill="var(--color-spent)"
					radius={4}
					barSize={18}
				>
					<LabelList
						dataKey="spent"
						position="right"
						className="fill-foreground"
						formatter={(value) => formatCompactMoney(Number(value))}
					/>
				</Bar>
			</BarChart>
		</ChartContainer>
	);
}
