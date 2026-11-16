import SignedAmount from "@/components/signed-amount";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { BankTransactionRow } from "@/lib/bank-transaction";
import { dayLabel, groupByDate } from "@/lib/date";

export default function BankHistoryCard({
	transactions,
	limited,
}: {
	transactions: BankTransactionRow[];
	limited: boolean;
}) {
	const showAccount = new Set(transactions.map((t) => t.account_name)).size > 1;

	return (
		<Card className="gap-0 pb-0">
			<CardHeader className="pb-3">
				<CardTitle>History</CardTitle>
				<CardDescription>
					{limited
						? `The latest transactions from your bank emails that are in your budget.`
						: "Transactions from your bank emails that are in your budget."}
				</CardDescription>
			</CardHeader>
			{groupByDate(transactions).map((group) => (
				<section key={group.date}>
					<h3 className="border-y bg-muted/40 px-4 py-1.5 text-xs font-medium text-muted-foreground">
						{group.date ? dayLabel(group.date) : "No date"}
					</h3>
					<ul>
						{group.rows.map((t) => (
							<li
								key={t.id}
								className="flex items-center gap-3 border-b px-4 py-2.5 last:border-b-0"
							>
								<div className="min-w-0 flex-1">
									<p className="truncate font-medium">{t.notes ?? "—"}</p>
									<p className="truncate text-xs text-muted-foreground">
										{[
											t.category_name ?? "Uncategorized",
											showAccount && t.account_name,
										]
											.filter(Boolean)
											.join(" · ")}
									</p>
								</div>
								<SignedAmount
									payment={t.payment}
									deposit={t.deposit}
									className="shrink-0"
								/>
							</li>
						))}
					</ul>
				</section>
			))}
		</Card>
	);
}
