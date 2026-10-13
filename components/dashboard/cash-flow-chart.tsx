"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCompactMoney, fromCents } from "@/lib/money";

const config = {
	income: { label: "Income", color: "var(--series-1)" },
	spent: { label: "Spent", color: "var(--series-2)" },
} satisfies ChartConfig;

export default function CashFlowChart({
	data,
}: {
	data: { label: string; income: number; spent: number }[];
}) {
	const points = data.map((d) => ({
		label: d.label,
		income: fromCents(d.income),
		spent: fromCents(d.spent),
	}));

	return (
		<ChartContainer config={config} className="aspect-auto h-56 w-full">
			<BarChart data={points} barGap={2} barCategoryGap="24%">
				<CartesianGrid vertical={false} />
				<XAxis dataKey="label" tickLine={false} axisLine={false} />
				<YAxis
					width={44}
					tickLine={false}
					axisLine={false}
					tickFormatter={formatCompactMoney}
				/>
				<ChartTooltip content={<ChartTooltipContent />} />
				<ChartLegend content={<ChartLegendContent />} />
				<Bar
					dataKey="income"
					fill="var(--color-income)"
					radius={[4, 4, 0, 0]}
				/>
				<Bar dataKey="spent" fill="var(--color-spent)" radius={[4, 4, 0, 0]} />
			</BarChart>
		</ChartContainer>
	);
}
