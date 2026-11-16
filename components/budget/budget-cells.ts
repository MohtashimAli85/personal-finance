import { cn } from "@/lib/tailwindcss/utils";

export const NUMBER_CELL = "h-8 w-24 px-3 text-right tabular-nums sm:w-32";
export const SPENT_CELL = "max-sm:hidden";
export const CATEGORY_INDENT = "pl-8";

export const amountTone = (cents: number) =>
	cn(cents === 0 && "text-muted-foreground");

export const balanceTone = (cents: number) =>
	cn(
		cents > 0 && "text-positive",
		cents < 0 && "text-destructive",
		cents === 0 && "text-muted-foreground",
	);
