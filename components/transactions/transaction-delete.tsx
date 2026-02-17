import { Trash2 } from "lucide-react";
import React, { useState, useTransition } from "react";
import { bulkDeleteTransactions } from "@/app/actions/transaction/mutations";
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

import { useTransactionSelection } from "@/context/transaction-selection-context";

const TransactionDelete = () => {
	const { selectedIds, clearSelection } = useTransactionSelection();
	const [isPending, startTransition] = useTransition();
	const [dialogOpen, setDialogOpen] = useState(false);

	const handleBulkDelete = () => {
		startTransition(async () => {
			await bulkDeleteTransactions(Array.from(selectedIds));
			clearSelection();
			setDialogOpen(false);
		});
	};
	if (!selectedIds.size) return null;
	return (
		<div className="flex items-center gap-2">
			<span className="text-sm text-muted-foreground">
				{selectedIds.size} selected
			</span>
			<AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<AlertDialogTrigger asChild>
					<Button variant="destructive" size="sm" disabled={isPending}>
						<Trash2 className="h-4 w-4" />
						Delete Selected
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Transactions?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete {selectedIds.size} transaction
							{selectedIds.size > 1 ? "s" : ""}? This action cannot be undone
							and will reverse all balance impacts.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleBulkDelete} disabled={isPending}>
							{isPending ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default TransactionDelete;
