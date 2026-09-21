"use client";

import {
	AlertCircle,
	ArrowUpRight,
	CheckCircle2,
	Chrome,
	Inbox,
	Loader2,
	Plus,
	RefreshCw,
	SearchCheck,
	Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
	addBankSenderConfigAction,
	type BankSenderConfig,
	removeBankSenderConfigAction,
	setBankSenderConfigEnabledAction,
	type UnparsedEmail,
} from "@/app/actions/bank/sender-config";
import {
	rescanBankTransactions,
	syncBankTransactions,
} from "@/app/actions/bank/sync";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { BankTransactionRow } from "@/lib/bank-transaction";

function SenderConfigCard({ configs }: { configs: BankSenderConfig[] }) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [senderEmail, setSenderEmail] = useState("");
	const [accountName, setAccountName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pendingDelete, setPendingDelete] = useState<BankSenderConfig | null>(
		null,
	);

	const handleAdd = () => {
		setError(null);
		startTransition(async () => {
			const result = await addBankSenderConfigAction(senderEmail, accountName);
			if (result.success) {
				setSenderEmail("");
				setAccountName("");
				router.refresh();
			} else {
				setError(result.error);
			}
		});
	};

	const handleToggle = (id: string, enabled: boolean) => {
		startTransition(async () => {
			await setBankSenderConfigEnabledAction(id, enabled);
			router.refresh();
		});
	};

	const handleRemove = () => {
		if (!pendingDelete) return;
		const id = pendingDelete.id;
		setPendingDelete(null);
		startTransition(async () => {
			await removeBankSenderConfigAction(id);
			router.refresh();
		});
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Bank senders</CardTitle>
				<p className="text-sm text-muted-foreground">
					Only emails from these senders are read and imported. Each sender
					maps to its own account.
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
							imported. Transactions already imported are kept. To pause
							imports without removing the sender, untick it instead.
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

function googleLoginHref() {
	const isElectron =
		typeof window !== "undefined" && Boolean(window.electronAPI?.isElectron);
	return `/api/auth/google/login?source=${isElectron ? "desktop" : "web"}`;
}

function ConnectCard() {
	return (
		<Card className="max-w-xl w-full mx-auto">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-lg">
					<Chrome className="h-5 w-5" />
					Connect your Gmail
				</CardTitle>
				<p className="text-sm text-muted-foreground">
					The app reads bank alert emails from your inbox to import transactions
					automatically. Sign in with Google to grant Gmail read-only access.
				</p>
			</CardHeader>
			<CardContent className="space-y-5">
				<ol className="space-y-2 text-sm list-decimal list-inside text-muted-foreground">
					<li>You&apos;ll be redirected to Google&apos;s consent screen.</li>
					<li>Approve Gmail read-only access for the app.</li>
					<li>You&apos;ll be brought back here, connected.</li>
				</ol>

				<a
					href={googleLoginHref()}
					className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-foreground text-background text-sm font-medium hover:opacity-90"
				>
					<Chrome className="h-4 w-4" />
					Sign in with Google
				</a>
			</CardContent>
		</Card>
	);
}

function formatDate(value: string | null) {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleDateString("en-CA");
}

// Bank mail that names an amount and a debit/credit but that no template could
// read. Surfacing it is the only way a parser gap gets noticed - otherwise the
// transaction just never appears and nothing says why.
function UnparsedCard({ emails }: { emails: UnparsedEmail[] }) {
	if (emails.length === 0) return null;

	return (
		<Card className="border-amber-500/40">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base text-amber-600">
					<AlertCircle className="h-4 w-4" />
					{emails.length} bank email{emails.length === 1 ? "" : "s"} couldn&apos;t
					be read
				</CardTitle>
				<p className="text-sm text-muted-foreground">
					These look like transaction alerts but no parser matched their
					format, so they were not imported. Ordinary mail such as login
					alerts is not listed here.
				</p>
			</CardHeader>
			<CardContent>
				<ul className="space-y-1 text-sm">
					{emails.map((email) => (
						<li key={email.id} className="flex gap-2 text-muted-foreground">
							<span className="whitespace-nowrap">{formatDate(email.date)}</span>
							<span className="truncate">{email.subject ?? "(no subject)"}</span>
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
}

interface SyncStatus {
	tone: "success" | "error";
	text: string;
	needsReauth?: boolean;
}

function StatusBanner({ status }: { status: SyncStatus }) {
	return (
		<output
			aria-live="polite"
			className={`flex w-full items-start gap-2 rounded-md border px-3 py-2 text-sm ${
				status.tone === "error"
					? "border-destructive/30 bg-destructive/10 text-destructive"
					: "border-emerald-600/30 bg-emerald-600/10 text-emerald-600"
			}`}
		>
			{status.tone === "error" ? (
				<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
			) : (
				<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
			)}
			<span className="flex-1">{status.text}</span>
		</output>
	);
}

export default function BankTransactionsClient({
	transactions,
	configured,
	email,
	senderConfigs,
	unparsed,
}: {
	transactions: BankTransactionRow[];
	configured: boolean;
	email: string | null;
	senderConfigs: BankSenderConfig[];
	unparsed: UnparsedEmail[];
}) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [status, setStatus] = useState<{
		tone: "success" | "error";
		text: string;
		needsReauth?: boolean;
	} | null>(null);

	// Electron deep-link: forward OAuth tokens to the backend to set cookies.
	useEffect(() => {
		if (typeof window === "undefined" || !window.electronAPI?.onOAuthCallback) {
			return;
		}
		const unsubscribe = window.electronAPI.onOAuthCallback(async (payload) => {
			try {
				await fetch("/api/auth/store-token", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						accessToken: payload.accessToken,
						refreshToken: payload.refreshToken ?? undefined,
						expiresIn: payload.expiresIn ?? undefined,
					}),
				});
				router.refresh();
			} catch {
				setStatus({
					tone: "error",
					text: "Failed to finish Gmail sign-in. Please try again.",
				});
			}
		});
		return unsubscribe;
	}, [router]);

	const totalSpent = transactions.reduce((sum, t) => sum + (t.payment ?? 0), 0);

	const refresh = () => router.refresh();

	const handleSync = () => {
		startTransition(async () => {
			setStatus(null);
			const result = await syncBankTransactions();
			if (result.success) {
				setStatus({
					tone: "success",
					text:
						result.inserted > 0
							? `Imported ${result.inserted} new transaction${result.inserted === 1 ? "" : "s"}`
							: "You're all caught up — no new transactions",
				});
				refresh();
			} else {
				setStatus({
					tone: "error",
					text: result.error,
					needsReauth: result.needsReauth,
				});
				// A revoked session clears its cookies server-side; refreshing swaps
				// this view over to the reconnect flow.
				if (result.needsReauth) refresh();
			}
		});
	};

	const handleRescan = () => {
		startTransition(async () => {
			setStatus(null);
			const result = await rescanBankTransactions();
			if (result.success) {
				const parts = [`Re-read ${result.scanned} bank emails`];
				if (result.inserted > 0) {
					parts.push(
						`recovered ${result.inserted} missing transaction${result.inserted === 1 ? "" : "s"}`,
					);
				}
				if (result.repaired > 0) {
					parts.push(`fixed ${result.repaired} description(s)`);
				}
				if (result.inserted === 0 && result.repaired === 0) {
					parts.push("nothing was missing");
				}
				setStatus({ tone: "success", text: `${parts.join(" — ")}.` });
				refresh();
			} else {
				setStatus({
					tone: "error",
					text: result.error,
					needsReauth: result.needsReauth,
				});
				if (result.needsReauth) refresh();
			}
		});
	};

	if (!configured) {
		return (
			<div className="max-w-4xl w-full mx-auto p-6 space-y-6 overflow-auto">
				<h1 className="text-2xl font-bold">Bank Transactions</h1>
				{status?.needsReauth && <StatusBanner status={status} />}
				<ConnectCard />
			</div>
		);
	}

	return (
		<div className="max-w-4xl w-full mx-auto p-6 space-y-6 overflow-auto">
			<div className="flex justify-between items-center gap-2 flex-wrap">
				<div>
					<h1 className="text-2xl font-bold">Bank Transactions</h1>
					<p className="text-sm text-muted-foreground">
						{email ? `Connected as ${email}` : "Connected to Gmail"}
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						onClick={handleRescan}
						disabled={isPending}
						size="sm"
						variant="outline"
						title="Re-read every bank email from scratch, ignoring the sync cursor. Recovers anything a normal sync missed."
					>
						<SearchCheck className="mr-2 h-4 w-4" />
						Deep rescan
					</Button>
					<Button onClick={handleSync} disabled={isPending} size="sm">
						{isPending ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<RefreshCw className="mr-2 h-4 w-4" />
						)}
						Sync bank emails
					</Button>
				</div>
			</div>

			{status && <StatusBanner status={status} />}

			<UnparsedCard emails={unparsed} />

			<SenderConfigCard configs={senderConfigs} />

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Total Spent (imported)
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-red-600">
							PKR {totalSpent.toLocaleString()}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Total Transactions
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{transactions.length}</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>History</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Date</TableHead>
								<TableHead>Description</TableHead>
								<TableHead>Account</TableHead>
								<TableHead>Type</TableHead>
								<TableHead className="text-right">Amount</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{transactions.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={5}
										className="text-center py-10 text-muted-foreground"
									>
										{senderConfigs.some((c) => c.enabled)
											? 'No transactions yet. Click "Sync bank emails" to import them.'
											: "Add an active bank sender above, then sync to import transactions."}
									</TableCell>
								</TableRow>
							) : (
								transactions.map((t) => {
									const isExpense = t.payment != null;
									return (
										<TableRow key={t.id}>
											<TableCell className="font-medium whitespace-nowrap">
												{formatDate(t.date)}
											</TableCell>
											<TableCell>{t.notes ?? "-"}</TableCell>
											<TableCell className="text-muted-foreground whitespace-nowrap">
												{t.account_name ?? "-"}
											</TableCell>
											<TableCell>
												{isExpense ? (
													<Badge variant="destructive">expense</Badge>
												) : (
													<Badge>income</Badge>
												)}
											</TableCell>
											<TableCell className="text-right font-bold whitespace-nowrap">
												<span className="inline-flex items-center gap-1">
													{isExpense ? null : (
														<ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
													)}
													PKR {(t.payment ?? t.deposit ?? 0).toLocaleString()}
												</span>
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
