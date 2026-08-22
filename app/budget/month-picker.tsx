"use client";

import { addMonths, format } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

type MonthPickerProps = {
	month: string;
};

const monthKeyToDate = (month: string) => {
	const [year, monthNumber] = month.split("-").map(Number);
	return new Date(year, monthNumber - 1, 1);
};

const dateToMonthKey = (date: Date) => format(date, "yyyy-MM");

export default function MonthPicker({ month }: MonthPickerProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const selectedMonth = useMemo(() => monthKeyToDate(month), [month]);
	const [calendarMonth, setCalendarMonth] = useState<Date>(selectedMonth);

	const updateMonth = (nextDate: Date) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("month", dateToMonthKey(nextDate));
		router.replace(`${pathname}?${params.toString()}`, { scroll: false });
	};

	return (
		<div className="flex items-center gap-2">
			<Button
				type="button"
				variant="table"
				size="icon-sm"
				onClick={() => updateMonth(addMonths(selectedMonth, -1))}
			>
				<ChevronLeft />
			</Button>
			<div className="min-w-36 text-center">
				<div className="text-muted-foreground text-xs">{format(selectedMonth, "yyyy")}</div>
				<div className="text-sm font-semibold">{format(selectedMonth, "MMMM")}</div>
			</div>
			<Button
				type="button"
				variant="table"
				size="icon-sm"
				onClick={() => updateMonth(addMonths(selectedMonth, 1))}
			>
				<ChevronRight />
			</Button>
			<Popover>
				<PopoverTrigger asChild>
					<Button type="button" variant="table" size="icon-sm">
						<CalendarIcon />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0">
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
		</div>
	);
}
