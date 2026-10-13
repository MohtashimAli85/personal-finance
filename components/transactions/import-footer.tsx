import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const count = new Intl.NumberFormat("en-US");

function importButtonLabel(isPending: boolean, newCount: number | undefined) {
	if (isPending) return "Importing...";
	if (newCount === undefined) return "Checking for duplicates...";
	if (newCount === 0) return "Nothing new to import";
	return `Import ${count.format(newCount)} new transaction${newCount !== 1 ? "s" : ""}`;
}

export default function ImportFooter({
	isPending,
	skippedInvalidDate,
	preview,
	onImport,
}: {
	isPending: boolean;
	skippedInvalidDate: number;
	preview: { newCount: number; duplicates: number } | null;
	onImport: () => void;
}) {
	return (
		<div className="flex flex-1 items-center justify-end gap-3">
			{skippedInvalidDate > 0 && (
				<p className="text-xs text-destructive">
					{count.format(skippedInvalidDate)} row
					{skippedInvalidDate !== 1 ? "s have" : " has"} an unreadable date
				</p>
			)}
			{preview && preview.duplicates > 0 && (
				<p className="text-xs text-muted-foreground">
					{count.format(preview.duplicates)} already in this account will be
					skipped
				</p>
			)}
			<Button
				onClick={onImport}
				disabled={isPending || !preview || preview.newCount === 0}
			>
				<Download className="size-3.5" />
				{importButtonLabel(isPending, preview?.newCount)}
			</Button>
		</div>
	);
}
