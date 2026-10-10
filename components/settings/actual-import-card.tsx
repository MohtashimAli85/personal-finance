"use client";

import { Loader2, Upload } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ActualImportDialog from "./actual-import-dialog";
import { useActualImport } from "./use-actual-import";

export default function ActualImportCard() {
	const input = useRef<HTMLInputElement>(null);
	const { file, preview, error, isPending, choose, cancel, confirm } =
		useActualImport();

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<Upload className="h-4 w-4" />
					Import from Actual Budget
				</CardTitle>
				<p className="text-sm text-muted-foreground">
					Choose the .zip from Actual&apos;s Settings → Export (or its
					db.sqlite). You&apos;ll see a preview before anything changes.
				</p>
			</CardHeader>
			<CardContent className="space-y-3">
				<input
					ref={input}
					type="file"
					accept=".zip,.sqlite"
					className="hidden"
					onChange={(event) => {
						const chosen = event.target.files?.[0];
						event.target.value = "";
						if (chosen) choose(chosen);
					}}
				/>
				<Button
					variant="outline"
					disabled={isPending}
					onClick={() => input.current?.click()}
				>
					{isPending && <Loader2 className="h-4 w-4 animate-spin" />}
					Choose file
				</Button>
				{error && !preview && (
					<p className="text-sm text-destructive">{error}</p>
				)}
			</CardContent>
			<ActualImportDialog
				fileName={file?.name ?? ""}
				preview={preview}
				error={error}
				isPending={isPending}
				onConfirm={confirm}
				onCancel={cancel}
			/>
		</Card>
	);
}
