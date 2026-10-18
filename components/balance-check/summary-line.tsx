import { Money } from "@/components/money";
import { cn } from "@/lib/tailwindcss/utils";

export default function SummaryLine({
	label,
	value,
	className,
}: {
	label: React.ReactNode;
	value: number;
	className?: string;
}) {
	return (
		<div className={cn("flex items-center justify-between text-sm", className)}>
			<span>{label}</span>
			<Money value={value} className="tabular-nums" />
		</div>
	);
}
