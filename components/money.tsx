import { formatCurrency } from "@/lib/helper";
import { cn } from "@/lib/tailwindcss/utils";

export function Money({
	value,
	className,
}: {
	value: number;
	className?: string;
}) {
	return (
		<span data-money className={cn("tabular-nums", className)}>
			{formatCurrency(value)}
		</span>
	);
}
