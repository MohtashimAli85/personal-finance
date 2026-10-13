import { AlertCircle, Inbox, Plus, Trash2 } from "lucide-react";
import type { BankSenderConfig } from "@/app/actions/bank/sender-config";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useSenderConfig } from "./use-sender-config";

export default function SenderConfigCard({
	configs,
}: {
	configs: BankSenderConfig[];
}) {
	const {
		isPending,
		senderEmail,
		setSenderEmail,
		accountName,
		setAccountName,
		error,
		pendingDelete,
		setPendingDelete,
		handleAdd,
		handleToggle,
		handleRemove,
	} = useSenderConfig();

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Bank senders</CardTitle>
				<p className="text-sm text-muted-foreground">
					Only emails from these senders are read and imported. Each sender maps
					to its own account.
				</p>
			</CardHeader>
			<CardContent className="space-y-4">
				{configs.length === 0 ? (
					<div className="flex items-center gap-3 rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
						<Inbox className="h-4 w-4 shrink-0" />
						No senders yet — add your bank&apos;s alert address below to start
						importing.
					</div>
				) : (
					<div className="space-y-2">
						{configs.map((config) => (
							<div
								key={config.id}
								className={`flex items-center gap-3 rounded-md border px-3 py-2 transition-opacity ${
									config.enabled ? "" : "opacity-50"
								}`}
							>
								<Checkbox
									checked={config.enabled}
									onCheckedChange={(checked) =>
										handleToggle(config.id, checked === true)
									}
									disabled={isPending}
									aria-label={`${config.enabled ? "Pause" : "Resume"} importing from ${config.senderEmail}`}
								/>
								<div className="flex-1 min-w-0">
									<div className="text-sm font-medium truncate">
										{config.accountName}
									</div>
									<div className="text-xs text-muted-foreground truncate">
										{config.senderEmail}
									</div>
								</div>
								{!config.enabled && (
									<Badge variant="secondary" className="shrink-0">
										paused
									</Badge>
								)}
								<Button
									variant="ghost"
									size="icon"
									disabled={isPending}
									aria-label={`Remove ${config.senderEmail}`}
									onClick={() => setPendingDelete(config)}
								>
									<Trash2 className="h-4 w-4 text-destructive" />
								</Button>
							</div>
						))}
					</div>
				)}

				<form
					className="flex flex-col sm:flex-row gap-2"
					onSubmit={(e) => {
						e.preventDefault();
						handleAdd();
					}}
				>
					<Input
						type="email"
						placeholder="sender@bank.com"
						aria-label="Bank sender email address"
						value={senderEmail}
						onChange={(e) => setSenderEmail(e.target.value)}
						disabled={isPending}
					/>
					<Input
						placeholder="Account name (e.g. HBL)"
						aria-label="Account name for this sender"
						value={accountName}
						onChange={(e) => setAccountName(e.target.value)}
						disabled={isPending}
					/>
					<Button
						type="submit"
						disabled={isPending || !senderEmail.trim() || !accountName.trim()}
						size="sm"
						className="shrink-0"
					>
						<Plus className="mr-1 h-4 w-4" />
						Add
					</Button>
				</form>
				{error && (
					<p className="flex items-center gap-2 text-sm text-destructive">
						<AlertCircle className="h-4 w-4 shrink-0" />
						{error}
					</p>
				)}
			</CardContent>

			<AlertDialog
				open={pendingDelete !== null}
				onOpenChange={(open) => !open && setPendingDelete(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Remove {pendingDelete?.accountName}?
						</AlertDialogTitle>
						<AlertDialogDescription>
							New emails from {pendingDelete?.senderEmail} will no longer be
							imported. Transactions already imported are kept. To pause imports
							without removing the sender, untick it instead.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleRemove}>Remove</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	);
}
