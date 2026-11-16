"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import TransactionEditForm from "./transaction-edit-form";

export default function TransactionEditSheet({
	tx,
	showAccount,
	onClose,
}: {
	tx: TransactionRow | null;
	showAccount: boolean;
	onClose: () => void;
}) {
	return (
		<Sheet open={!!tx} onOpenChange={(open) => !open && onClose()}>
			<SheetContent
				side="bottom"
				className="max-h-[90svh] overflow-y-auto rounded-t-xl"
			>
				{tx && (
					<TransactionEditForm
						tx={tx}
						showAccount={showAccount}
						onClose={onClose}
					/>
				)}
			</SheetContent>
		</Sheet>
	);
}
