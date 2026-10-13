import { formatCurrency } from "@/lib/helper";

export function Money({
	value,
	className,
}: {
	value: number;
	className?: string;
}) {
	return (
		<span data-money className={className}>
			{formatCurrency(value)}
		</span>
	);
}
