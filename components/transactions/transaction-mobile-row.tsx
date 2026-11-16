"use client";

import SignedAmount from "@/components/signed-amount";
import { formatShortDate } from "@/lib/date";
import { cn } from "@/lib/tailwindcss/utils";
import { useIsOffBudget } from "./use-is-off-budget";

export default function TransactionMobileRow({
	tx,
	showAccount,
	style,
	onOpen,
}: {
	tx: TransactionRow;
	showAccount: boolean;
	style: React.CSSProperties;
	onOpen: (id: string) => void;
}) {
	const offBudget = useIsOffBudget(tx.account_id);
	const pending = tx.status === "pending";
	const details = [
		formatShortDate(tx.date),
		tx.category_name ?? (offBudget ? "Off budget" : "Uncategorized"),
		showAccount && tx.account_name,
		pending && "Pending review",
	].filter(Boolean);

	return (
		<button
			type="button"
			style={style}
			onClick={() => onOpen(tx.id)}
			className="absolute inset-x-0 flex items-center gap-3 border-b px-3 text-left outline-none hover:bg-muted/50 focus-visible:bg-muted/50"
		>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span
					className={cn(
						"truncate font-medium",
						pending && "italic text-muted-foreground",
						!tx.notes && "text-muted-foreground",
					)}
				>
					{tx.notes || "No notes"}
				</span>
				<span className="truncate text-xs text-muted-foreground">
					{details.join(" · ")}
				</span>
			</span>
			<SignedAmount
				payment={tx.payment}
				deposit={tx.deposit}
				className="shrink-0"
			/>
		</button>
	);
}
