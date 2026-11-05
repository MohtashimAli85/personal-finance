import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button size="sm" variant="outline" disabled={busy}>
						Reject
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Reject transactions?</AlertDialogTitle>
						<AlertDialogDescription>
							{selected.length} transaction{selected.length === 1 ? "" : "s"}{" "}
							will be removed and won&apos;t be imported again on the next sync.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={() => onReject(selected)}>
							Reject
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
