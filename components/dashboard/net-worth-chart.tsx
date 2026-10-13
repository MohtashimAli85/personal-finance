"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCompactMoney, fromCents } from "@/lib/money";

const config = {
	netWorth: { label: "Net worth", color: "var(--series-1)" },
} satisfies ChartConfig;

export default function NetWorthChart({
	data,
}: {
	data: { label: string; netWorth: number }[];
}) {
	const points = data.map((d) => ({
		label: d.label,
		netWorth: fromCents(d.netWorth),
	}));

	return (
		<ChartContainer config={config} className="aspect-auto h-56 w-full">
			<AreaChart data={points}>
				<defs>
					<linearGradient id="net-worth-fill" x1="0" y1="0" x2="0" y2="1">
						<stop
							offset="0%"
							stopColor="var(--color-netWorth)"
							stopOpacity={0.3}
						/>
						<stop
							offset="100%"
							stopColor="var(--color-netWorth)"
							stopOpacity={0}
						/>
					</linearGradient>
				</defs>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="label"
					tickLine={false}
					axisLine={false}
					minTickGap={16}
				/>
				<YAxis
					width={44}
					tickLine={false}
					axisLine={false}
					tickFormatter={formatCompactMoney}
					domain={["auto", "auto"]}
				/>
				<ChartTooltip content={<ChartTooltipContent indicator="line" />} />
				<Area
					dataKey="netWorth"
					type="monotone"
					stroke="var(--color-netWorth)"
					strokeWidth={2}
					fill="url(#net-worth-fill)"
					activeDot={{ r: 4 }}
				/>
			</AreaChart>
		</ChartContainer>
	);
}
