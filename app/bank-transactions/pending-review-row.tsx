import CategoryCombobox from "@/components/categories/category-combobox";
import SignedAmount from "@/components/signed-amount";
import TransactionCheckbox from "@/components/transactions/transaction-checkbox";
import type { BankTransactionRow } from "@/lib/bank-transaction";
import { formatShortDate } from "@/lib/date";
import PendingRowActions from "./pending-row-actions";

export default function PendingReviewRow({
	transaction: t,
	showAccount,
	category,
	busy,
	onCategoryChange,
	onAccept,
	onReject,
}: {
	transaction: BankTransactionRow;
	showAccount: boolean;
	category?: string;
	busy: boolean;
	onCategoryChange: (value: string) => void;
	onAccept: () => void;
	onReject: () => void;
}) {
	return (
		<li className="group flex flex-wrap items-center gap-x-3 gap-y-2 border-t px-4 py-3">
			<TransactionCheckbox id={t.id} alwaysVisible />
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium">{t.notes ?? "—"}</p>
				<p className="truncate text-xs text-muted-foreground">
					{[formatShortDate(t.date), showAccount && t.account_name]
						.filter(Boolean)
						.join(" · ")}
				</p>
			</div>
			<SignedAmount
				payment={t.payment}
				deposit={t.deposit}
				className="shrink-0"
			/>
			<div className="flex w-full items-center gap-2 pl-7 md:w-auto md:pl-0">
				<div className="min-w-0 flex-1 md:w-48 md:flex-none">
					<CategoryCombobox
						value={category}
						label={t.category_name ?? undefined}
						onChange={onCategoryChange}
						variant="default"
					/>
				</div>
				<PendingRowActions
					disabled={busy}
					onAccept={onAccept}
					onReject={onReject}
				/>
			</div>
		</li>
	);
}
