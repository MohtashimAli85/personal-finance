"use client";
import AccountCombobox from "@/components/accounts/account-combobox";
import TransactionCategory from "@/components/transactions/transaction-category";
import { fromCents } from "@/lib/money";
import { cn } from "@/lib/tailwindcss/utils";
import AmountRowList from "./amount-row-list";
import SummaryLine from "./summary-line";
import type { AmountRow, AmountRows } from "./use-amount-rows";

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
	const fillRemaining = (row: AmountRow | undefined) => {
		if (row && !row.amount && remaining > 0)
			rows.update(row.id, { amount: String(fromCents(remaining)) });
	};

	return (
		<section className="space-y-2">
			<h3 className="text-sm font-medium">
				Distribute the difference as {isDeposit ? "income" : "spending"}
			</h3>
			<AccountCombobox
				value={accountId}
				onChange={(id) => {
					onAccountChange(id);
					fillRemaining(rows.rows[0]);
				}}
				openOnFocus
			/>
			<AmountRowList
				rows={rows}
				addLabel="Add category"
				renderTarget={(row) => (
					<TransactionCategory
						accountId={accountId}
						value={row.target || undefined}
						onChange={(target) => {
							rows.update(row.id, { target });
							fillRemaining(row);
						}}
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
