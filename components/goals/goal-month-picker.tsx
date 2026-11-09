"use client";

import { addYears } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { getMonthKey, isMonthKey, parseMonthKey } from "@/lib/date";
import { formatMonthLabel } from "./month-label";

export function GoalMonthPicker({
	value,
	onChange,
	invalid,
}: {
	value: string;
	onChange: (value: string) => void;
	invalid?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [endMonth] = useState(() => addYears(new Date(), 50));
	const selected = isMonthKey(value) ? parseMonthKey(value) : undefined;

	const pick = (month: string) => {
		onChange(month);
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					aria-invalid={invalid}
					className="w-full justify-between font-normal"
				>
					{selected ? (
						formatMonthLabel(value)
					) : (
						<span className="text-muted-foreground">Pick a month</span>
					)}
					<CalendarIcon className="text-muted-foreground" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="end">
				<Calendar
					mode="single"
					captionLayout="dropdown"
					showOutsideDays={false}
					selected={selected}
					defaultMonth={selected}
					endMonth={endMonth}
					onSelect={(date) => date && pick(getMonthKey(date))}
				/>
				{selected && (
					<div className="border-t p-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="w-full"
							onClick={() => pick("")}
						>
							Clear
						</Button>
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
