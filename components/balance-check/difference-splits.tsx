"use client";
import AccountCombobox from "@/components/accounts/account-combobox";
import TransactionCategory from "@/components/transactions/transaction-category";
import { cn } from "@/lib/tailwindcss/utils";
import AmountRowList from "./amount-row-list";
import SummaryLine from "./summary-line";
import type { AmountRows } from "./use-amount-rows";

export default function DifferenceSplits({
	rows,
	accountId,
	onAccountChange,
	isDeposit,
	remaining,
}: {
	rows: AmountRows;
	accountId?: string;
	onAccountChange: (accountId: string) => void;
	isDeposit: boolean;
	remaining: number;
}) {
	return (
		<section className="space-y-2">
			<h3 className="text-sm font-medium">
				Distribute the difference as {isDeposit ? "income" : "spending"}
			</h3>
			<AccountCombobox
				value={accountId}
				onChange={onAccountChange}
				openOnFocus
			/>
			<AmountRowList
				rows={rows}
				addLabel="Add category"
				renderTarget={(row) => (
					<TransactionCategory
						accountId={accountId}
						value={row.target || undefined}
						onChange={(target) => rows.update(row.id, { target })}
						variant="default"
					/>
				)}
			/>
			<SummaryLine
				label="Remaining"
				value={remaining}
				className={cn(
					"font-medium",
					remaining === 0 ? "text-emerald-500" : "text-destructive",
				)}
			/>
		</section>
	);
}
