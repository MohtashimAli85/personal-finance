import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/helper";
import { cn } from "@/lib/tailwindcss/utils";

export default function StatCard({
	label,
	value,
	icon: Icon,
	footer,
	href,
	valueClassName,
}: {
	label: string;
	value: number;
	icon: LucideIcon;
	footer: React.ReactNode;
	href?: string;
	valueClassName?: string;
}) {
	const card = (
		<Card
			className={cn(
				"h-full gap-2",
				href && "transition-colors hover:bg-muted/40",
			)}
		>
			<CardHeader>
				<CardDescription>{label}</CardDescription>
				<CardTitle
					data-money
					className={cn("text-2xl font-semibold tabular-nums", valueClassName)}
				>
					{formatCurrency(value)}
				</CardTitle>
				<CardAction>
					<Icon className="size-4 text-muted-foreground" />
				</CardAction>
			</CardHeader>
			<CardContent className="text-xs text-muted-foreground">
				{footer}
			</CardContent>
		</Card>
	);

	return href ? <Link href={href}>{card}</Link> : card;
}
