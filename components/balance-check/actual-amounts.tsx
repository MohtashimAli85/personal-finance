"use client";
import { Input } from "@/components/ui/input";
import AmountRowList from "./amount-row-list";
import SummaryLine from "./summary-line";
import type { AmountRows } from "./use-amount-rows";

export default function ActualAmounts({ rows }: { rows: AmountRows }) {
	return (
		<section className="space-y-2">
			<h3 className="text-sm font-medium">What I actually have</h3>
			<AmountRowList
				rows={rows}
				addLabel="Add amount"
				renderTarget={(row) => (
					<Input
						placeholder="e.g. Cash, Meezan"
						value={row.target}
						onChange={(e) => rows.update(row.id, { target: e.target.value })}
					/>
				)}
			/>
			<SummaryLine
				label="Actual total"
				value={rows.total}
				className="font-medium"
			/>
		</section>
	);
}
