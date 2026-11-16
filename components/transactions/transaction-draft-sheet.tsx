"use client";

import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { useTransactionContext } from "@/context/transaction-context";
import { useIsMobile } from "@/hooks/use-mobile";
import TransactionSheetFields from "./transaction-sheet-fields";

export default function TransactionDraftSheet({
	showAccount,
}: {
	showAccount: boolean;
}) {
	const isMobile = useIsMobile();
	const {
		transaction: tx,
		updateTransaction,
		addTransaction,
		cancelTransaction,
	} = useTransactionContext();

	return (
		<Sheet
			open={isMobile && !!tx}
			onOpenChange={(open) => !open && cancelTransaction()}
		>
			<SheetContent
				side="bottom"
				className="max-h-[90svh] overflow-y-auto rounded-t-xl"
			>
				<SheetHeader>
					<SheetTitle>Add transaction</SheetTitle>
					<SheetDescription>
						Enter an amount in either Payment or Deposit.
					</SheetDescription>
				</SheetHeader>
				{tx && (
					<form
						className="flex flex-col gap-4"
						onSubmit={(event) => {
							event.preventDefault();
							addTransaction(false);
						}}
					>
						<div className="px-4">
							<TransactionSheetFields
								date={tx.date}
								onDateChange={(date) => updateTransaction({ date })}
								account={
									showAccount
										? {
												value: tx.account_id || undefined,
												onChange: (value) =>
													updateTransaction({ account_id: value }),
											}
										: undefined
								}
								category={{
									accountId: tx.account_id,
									value: tx.category_id ?? undefined,
									onChange: (value) =>
										updateTransaction({ category_id: value }),
								}}
								notes={{
									value: tx.notes,
									onChange: (e) => updateTransaction({ notes: e.target.value }),
								}}
								payment={{
									value: tx.payment || undefined,
									onChange: (value) =>
										updateTransaction({ payment: Number(value), deposit: 0 }),
								}}
								deposit={{
									value: tx.deposit || undefined,
									onChange: (value) =>
										updateTransaction({ payment: 0, deposit: Number(value) }),
								}}
							/>
						</div>
						<SheetFooter className="flex-row justify-end">
							<Button
								type="button"
								variant="outline"
								onClick={cancelTransaction}
							>
								Cancel
							</Button>
							<Button type="submit">Add transaction</Button>
						</SheetFooter>
					</form>
				)}
			</SheetContent>
		</Sheet>
	);
}
