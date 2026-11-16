"use client";

import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { plural } from "@/lib/helper";
import { useDeleteSelected } from "./use-delete-selected";

export default function TransactionDelete() {
	const { count, isPending, remove, clearSelection, needsConfirm } =
		useDeleteSelected();

	const deleteButton = (
		<Button
			variant="destructive"
			size="sm"
			disabled={isPending}
			onClick={needsConfirm ? undefined : remove}
		>
			<Trash2 />
			Delete
		</Button>
	);

	return (
		<div className="flex items-center gap-2">
			<span className="text-sm font-medium">{count} selected</span>
			<Button variant="ghost" size="sm" onClick={clearSelection}>
				Clear
			</Button>
			{needsConfirm ? (
				<ConfirmDialog
					title={`Delete ${plural(count, "transaction")}?`}
					description="Account balances will update to match. You can undo this for a few seconds afterwards."
					onConfirm={remove}
					trigger={deleteButton}
				/>
			) : (
				deleteButton
			)}
		</div>
	);
}
