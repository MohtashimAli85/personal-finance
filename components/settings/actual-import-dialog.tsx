import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { ActualPreview } from "@/lib/actual-import";

export default function ActualImportDialog({
	fileName,
	preview,
	error,
	isPending,
	onConfirm,
	onCancel,
}: {
	fileName: string;
	preview: ActualPreview | null;
	error: string | null;
	isPending: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}) {
	const rows = preview
		? [
				["Accounts", preview.accounts],
				["Category groups", preview.groups],
				["Categories", preview.categories],
				["Transactions", preview.transactions],
				["Budget entries", preview.budgets],
				["Holds", preview.holds],
			]
		: [];

	return (
		<Dialog
			open={preview !== null}
			onOpenChange={(open) => !open && !isPending && onCancel()}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Import {fileName}?</DialogTitle>
					<DialogDescription>
						This replaces your accounts, categories, transactions and budgets
						with the data below. Your current database is backed up first.
					</DialogDescription>
				</DialogHeader>
				<dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
					{rows.map(([label, count]) => (
						<div key={label} className="contents">
							<dt className="text-muted-foreground">{label}</dt>
							<dd className="text-right tabular-nums">
								{count.toLocaleString()}
							</dd>
						</div>
					))}
				</dl>
				<div className="text-sm">
					<p className="font-medium">
						Goals kept ({preview?.goals.length ?? 0})
					</p>
					{preview?.goals.length ? (
						<ul className="list-disc pl-5 text-muted-foreground">
							{preview.goals.map((goal) => (
								<li key={`${goal.name}:${goal.category}`}>
									{goal.name} ({goal.category})
								</li>
							))}
						</ul>
					) : (
						<p className="text-muted-foreground">You have no savings goals.</p>
					)}
				</div>
				{error && <p className="text-sm text-destructive">{error}</p>}
				<DialogFooter>
					<Button variant="outline" disabled={isPending} onClick={onCancel}>
						Cancel
					</Button>
					<Button disabled={isPending} onClick={onConfirm}>
						{isPending && <Loader2 className="h-4 w-4 animate-spin" />}
						Replace my data
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
