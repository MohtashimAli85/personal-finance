import { cn } from "@/lib/tailwindcss/utils";

export default function PageFigure({
	label,
	className,
	children,
}: {
	label: string;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-baseline gap-1.5">
			<dt className="text-muted-foreground">{label}</dt>
			<dd className={cn("font-medium tabular-nums", className)}>{children}</dd>
		</div>
	);
}
