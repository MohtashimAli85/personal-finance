"use client";

import { format } from "date-fns";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/helper";
import { cn } from "@/lib/tailwindcss/utils";
import HoldForNextMonth from "./hold-for-next-month";
import ToBudgetBreakdown from "./to-budget-breakdown";

export default function ToBudgetSummary({ view }: { view: BudgetView }) {
	const [open, setOpen] = useState(false);
	const [year, m] = view.month.split("-").map(Number);
	const over = view.toBudget < 0;

	return (
		<Card className="gap-0 py-0">
			<CardHeader className="border-b px-4 py-3 text-center">
				<CardTitle>{format(new Date(year, m - 1, 1), "MMMM")}</CardTitle>
			</CardHeader>
			<CardContent className="flex justify-center px-4 py-3">
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<button
							type="button"
							className="flex flex-col items-center gap-1 rounded-md px-4 py-1 hover:bg-muted"
						>
							<span className="text-sm text-muted-foreground">
								{over ? "Overbudgeted:" : "To Budget:"}
							</span>
							<span
								data-money
								className={cn(
									"text-4xl font-semibold tracking-tight",
									over
										? "text-destructive"
										: view.toBudget > 0 && "text-emerald-500",
								)}
							>
								{formatCurrency(view.toBudget)}
							</span>
						</button>
					</PopoverTrigger>
					<PopoverContent className="w-80 space-y-3">
						<ToBudgetBreakdown view={view} />
						{(view.toBudget > 0 || view.buffered > 0) && (
							<>
								<Separator />
								<HoldForNextMonth view={view} onDone={() => setOpen(false)} />
							</>
						)}
					</PopoverContent>
				</Popover>
			</CardContent>
		</Card>
	);
}
