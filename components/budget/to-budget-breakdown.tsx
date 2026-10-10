import { format } from "date-fns";
import { formatCurrency } from "@/lib/helper";

const prevMonthName = (month: string) => {
	const [year, m] = month.split("-").map(Number);
	return format(new Date(year, m - 2, 1), "MMM");
};

export default function ToBudgetBreakdown({ view }: { view: BudgetView }) {
	const rows = [
		{ label: "Available funds", value: view.availableFunds },
		{
			label: `Overspent in ${prevMonthName(view.month)}`,
			value: view.lastMonthOverspent,
		},
		{ label: "Budgeted", value: -view.budgeted },
		{ label: "For next month", value: -view.buffered },
	];

	return (
		<dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
			{rows.map((row) => (
				<div key={row.label} className="contents">
					<dt className="text-muted-foreground">{row.label}</dt>
					<dd className="text-right tabular-nums" data-money>
						{formatCurrency(row.value)}
					</dd>
				</div>
			))}
		</dl>
	);
}
