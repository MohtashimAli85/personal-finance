"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { formateDate } from "@/lib/date";

interface TransactionDatePickerProps {
	date: string;
	onSelect: (date: string) => void;
	defaultOpen?: boolean;
}
export function TransactionDatePicker({
	date,
	onSelect,
	defaultOpen,
}: TransactionDatePickerProps) {
	const [open, setOpen] = useState(defaultOpen);
	const handleSelect = (date: Date) => onSelect(date.toISOString());
	const onKeyDown = (
		date: Date,
		_: unknown,
		e: React.KeyboardEvent<Element>,
	) => {
		if (e.key === "Enter") {
			handleSelect(date);
			setOpen(false);
		}
	};
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button id="date" variant="table" className="pl-1">
					{date ? formateDate(date) : <span>Pick a date</span>}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={new Date(date)}
					onSelect={handleSelect}
					onDayKeyDown={onKeyDown}
					autoFocus
					required
				/>
			</PopoverContent>
		</Popover>
	);
}
