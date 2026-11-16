import { formatCurrency } from "@/lib/helper";
import { cn } from "@/lib/tailwindcss/utils";

export default function SignedAmount({
	payment,
	deposit,
	className,
}: {
	payment: number | null;
	deposit: number | null;
	className?: string;
}) {
	const amount = (deposit ?? 0) - (payment ?? 0);

	return (
		<span
			data-money
			className={cn(
				"font-medium tabular-nums",
				amount > 0 && "text-positive",
				className,
			)}
		>
			{amount > 0 && "+"}
			{formatCurrency(amount)}
		</span>
	);
}
