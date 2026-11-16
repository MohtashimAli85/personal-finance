import { AlertCircle, Plus, Trash2 } from "lucide-react";
import type { BankSenderConfig } from "@/app/actions/bank/sender-config";
import ConfirmDialog from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/tailwindcss/utils";
import { useSenderConfig } from "./use-sender-config";

export default function SenderConfig({
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
		<div className="flex flex-col gap-3">
			{configs.length > 0 && (
				<ul className="divide-y rounded-lg border">
					{configs.map((config) => (
						<li key={config.id} className="flex items-center gap-3 px-3 py-2">
							<div
								className={cn(
									"min-w-0 flex-1",
									!config.enabled && "opacity-60",
								)}
							>
								<p className="truncate text-sm font-medium">
									{config.accountName}
								</p>
								<p className="truncate text-xs text-muted-foreground">
									{config.enabled ? config.senderEmail : "Paused"}
								</p>
							</div>
							<Switch
								checked={config.enabled}
								onCheckedChange={(checked) => handleToggle(config.id, checked)}
								disabled={isPending}
								aria-label={`Import from ${config.senderEmail}`}
							/>
							<Button
								variant="ghost"
								size="icon-sm"
								disabled={isPending}
								aria-label={`Remove ${config.senderEmail}`}
								onClick={() => setPendingDelete(config)}
							>
								<Trash2 className="text-destructive" />
							</Button>
						</li>
					))}
				</ul>
			)}

			<form
				className="flex flex-col gap-2"
				onSubmit={(e) => {
					e.preventDefault();
					handleAdd();
				}}
			>
				<Input
					type="email"
					placeholder="Sender address, e.g. alerts@bank.com"
					aria-label="Bank sender email address"
					value={senderEmail}
					onChange={(e) => setSenderEmail(e.target.value)}
					disabled={isPending}
				/>
				<Input
					placeholder="Account to import into, e.g. HBL"
					aria-label="Account name for this sender"
					value={accountName}
					onChange={(e) => setAccountName(e.target.value)}
					disabled={isPending}
				/>
				<Button
					type="submit"
					variant="outline"
					disabled={isPending || !senderEmail.trim() || !accountName.trim()}
				>
					<Plus />
					Add sender
				</Button>
			</form>
			{error && (
				<p className="flex items-center gap-2 text-sm text-destructive">
					<AlertCircle className="size-4 shrink-0" />
					{error}
				</p>
			)}

			<ConfirmDialog
				open={pendingDelete !== null}
				onOpenChange={(open) => !open && setPendingDelete(null)}
				title={`Remove ${pendingDelete?.accountName ?? "sender"}?`}
				description={
					<>
						New emails from {pendingDelete?.senderEmail} will no longer be
						imported. Transactions already imported are kept. To pause imports
						without removing the sender, switch it off instead.
					</>
				}
				confirmLabel="Remove"
				onConfirm={handleRemove}
			/>
		</div>
	);
}
