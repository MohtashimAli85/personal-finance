import ConfirmDialog from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import type { BankTransactionRow } from "@/lib/bank-transaction";
import { useSelectedPending } from "./use-selected-pending";

export default function PendingBulkActions({
	rows,
	busy,
	onAccept,
	onReject,
}: {
	rows: BankTransactionRow[];
	busy: boolean;
	onAccept: (rows: BankTransactionRow[]) => void;
	onReject: (rows: BankTransactionRow[]) => void;
}) {
	const selected = useSelectedPending(rows);

	if (selected.length === 0) return null;

	return (
		<div className="flex items-center gap-2">
			<span className="text-sm text-muted-foreground">
				{selected.length} selected
			</span>
			<Button size="sm" disabled={busy} onClick={() => onAccept(selected)}>
				Accept
			</Button>
			<ConfirmDialog
				title="Reject transactions?"
				description={`${selected.length} transaction${selected.length === 1 ? "" : "s"} will be removed and won't be imported again on the next sync.`}
				confirmLabel="Reject"
				onConfirm={() => onReject(selected)}
				trigger={
					<Button size="sm" variant="outline" disabled={busy}>
						Reject
					</Button>
				}
			/>
		</div>
	);
}
