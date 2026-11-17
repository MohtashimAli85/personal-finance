"use client";

import { Trash2, TriangleAlert } from "lucide-react";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ERASE_CONFIRMATION, useEraseData } from "./use-erase-data";

export default function EraseDataCard() {
	const {
		open,
		changeOpen,
		typed,
		setTyped,
		error,
		isPending,
		canConfirm,
		confirm,
	} = useEraseData();

	return (
		<Card className="border-destructive/40">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<TriangleAlert className="size-4 text-destructive" />
					Erase all data
				</CardTitle>
				<p className="text-sm text-muted-foreground">
					Deletes every account, transaction, budget, goal and chat, plus your
					profile and saved AI keys. A backup is saved first, so you can still
					import it later.
				</p>
			</CardHeader>
			<CardContent>
				<AlertDialog open={open} onOpenChange={changeOpen}>
					<AlertDialogTrigger asChild>
						<Button variant="destructive">
							<Trash2 className="size-4" />
							Erase all data
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<form
							className="contents"
							onSubmit={(event) => {
								event.preventDefault();
								if (canConfirm) confirm();
							}}
						>
							<AlertDialogHeader>
								<AlertDialogTitle>Erase all of your data?</AlertDialogTitle>
								<AlertDialogDescription>
									The app goes back to a fresh start. Type{" "}
									<span className="font-mono font-medium text-foreground">
										{ERASE_CONFIRMATION}
									</span>{" "}
									to confirm.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<Input
								autoFocus
								value={typed}
								onChange={(event) => setTyped(event.target.value)}
								disabled={isPending}
								aria-label={`Type ${ERASE_CONFIRMATION} to confirm`}
								autoComplete="off"
							/>
							{error && <p className="text-sm text-destructive">{error}</p>}
							<AlertDialogFooter>
								<Button
									type="button"
									variant="outline"
									disabled={isPending}
									onClick={() => changeOpen(false)}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									variant="destructive"
									disabled={!canConfirm}
								>
									{isPending && <Spinner />}
									Erase everything
								</Button>
							</AlertDialogFooter>
						</form>
					</AlertDialogContent>
				</AlertDialog>
			</CardContent>
		</Card>
	);
}
