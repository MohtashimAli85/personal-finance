"use client";

import { DatabaseBackup, Download, Loader2, Upload } from "lucide-react";
import { useRef } from "react";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useImportBackup } from "./use-import-backup";

export default function BackupCard() {
	const input = useRef<HTMLInputElement>(null);
	const { file, error, isPending, choose, cancel, confirm } = useImportBackup();

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<DatabaseBackup className="h-4 w-4" />
					Export and import
				</CardTitle>
				<p className="text-sm text-muted-foreground">
					Export saves everything (accounts, transactions, budgets, goals, chats
					and settings) to one file. Import it here or on another computer to
					get it all back.
				</p>
			</CardHeader>
			<CardContent className="space-y-3">
				<input
					ref={input}
					type="file"
					accept=".sqlite"
					className="hidden"
					onChange={(event) => {
						const chosen = event.target.files?.[0];
						event.target.value = "";
						if (chosen) choose(chosen);
					}}
				/>
				<div className="flex flex-wrap gap-2">
					<Button variant="outline" asChild>
						<a href="/api/export" download>
							<Download className="h-4 w-4" />
							Export data
						</a>
					</Button>
					<Button
						variant="outline"
						disabled={isPending}
						onClick={() => input.current?.click()}
					>
						<Upload className="h-4 w-4" />
						Import data
					</Button>
				</div>
				{error && !file && <p className="text-sm text-destructive">{error}</p>}
			</CardContent>
			<AlertDialog
				open={file !== null}
				onOpenChange={(open) => !open && !isPending && cancel()}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Import {file?.name}?</AlertDialogTitle>
						<AlertDialogDescription>
							This replaces all of your current data with the data in this file.
							Your current data is backed up first.
						</AlertDialogDescription>
					</AlertDialogHeader>
					{error && <p className="text-sm text-destructive">{error}</p>}
					<AlertDialogFooter>
						<Button variant="outline" disabled={isPending} onClick={cancel}>
							Cancel
						</Button>
						<Button disabled={isPending} onClick={confirm}>
							{isPending && <Loader2 className="h-4 w-4 animate-spin" />}
							Replace my data
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	);
}
