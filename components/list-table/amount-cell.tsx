import { formatCurrency } from "@/lib/helper";
import { cn } from "@/lib/tailwindcss/utils";
import ListCell from "./list-cell";

export default function AmountCell({
	payment,
	deposit,
}: {
	payment: number | null;
	deposit: number | null;
}) {
	const amount = (deposit ?? 0) - (payment ?? 0);

	return (
		<ListCell
			data-money
			className={cn(
				"text-right font-medium tabular-nums",
				amount > 0 && "text-emerald-500",
			)}
		>
			{amount > 0 && "+"}
			{formatCurrency(amount)}
		</ListCell>
	);
}
