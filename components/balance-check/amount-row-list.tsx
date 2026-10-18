"use client";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputNumber } from "@/components/ui/input-number";
import type { AmountRow, AmountRows } from "./use-amount-rows";

export default function AmountRowList({
	rows,
	addLabel,
	renderTarget,
}: {
	rows: AmountRows;
	addLabel: string;
	renderTarget: (row: AmountRow) => React.ReactNode;
}) {
	return (
		<div className="space-y-2">
			{rows.rows.map((row) => (
				<div key={row.id} className="flex items-center gap-2">
					<div className="min-w-0 flex-1">{renderTarget(row)}</div>
					<InputNumber
						className="w-32"
						placeholder="0"
						value={row.amount}
						onChange={(amount) => rows.update(row.id, { amount })}
					/>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Remove"
						disabled={rows.rows.length === 1}
						onClick={() => rows.remove(row.id)}
					>
						<X />
					</Button>
				</div>
			))}
			<Button variant="outline" size="sm" onClick={rows.add}>
				<Plus /> {addLabel}
			</Button>
		</div>
	);
}
