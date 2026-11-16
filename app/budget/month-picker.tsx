"use client";

import { addMonths, format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useQueryState } from "@/hooks/use-query-state";
import { getMonthKey, parseMonthKey } from "@/lib/date";

export default function MonthPicker({ month }: { month: string }) {
	const [, setMonth] = useQueryState("month");
	const selectedMonth = useMemo(() => parseMonthKey(month), [month]);
	const [calendarMonth, setCalendarMonth] = useState<Date>(selectedMonth);
	const updateMonth = (next: Date) => setMonth(getMonthKey(next));

	return (
		<div className="flex items-center">
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label="Previous month"
				onClick={() => updateMonth(addMonths(selectedMonth, -1))}
			>
				<ChevronLeft />
			</Button>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant="ghost"
						className="min-w-36 font-semibold"
						aria-label="Choose month"
					>
						{format(selectedMonth, "MMMM yyyy")}
					</Button>
				</PopoverTrigger>
				<PopoverContent align="center" className="w-auto p-0">
					<Calendar
						mode="single"
						showOutsideDays={false}
						captionLayout="dropdown"
						month={calendarMonth}
						selected={selectedMonth}
						onMonthChange={setCalendarMonth}
						onSelect={(date) => {
							if (!date) return;
							updateMonth(new Date(date.getFullYear(), date.getMonth(), 1));
						}}
					/>
				</PopoverContent>
			</Popover>
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label="Next month"
				onClick={() => updateMonth(addMonths(selectedMonth, 1))}
			>
				<ChevronRight />
			</Button>
		</div>
	);
}
