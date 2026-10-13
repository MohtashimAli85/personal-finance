"use client";

import { Loader2, RefreshCw, SearchCheck } from "lucide-react";
import type {
	BankSenderConfig,
	UnparsedEmail,
} from "@/app/actions/bank/sender-config";
import BankHistoryCard from "@/components/bank-transactions/bank-history-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/money";
import PageContainer from "@/components/page-container";
import type { BankTransactionRow } from "@/lib/bank-transaction";
import ConnectCard from "./connect-card";
import PendingReviewCard from "./pending-review-card";
import SenderConfigCard from "./sender-config-card";
import StatusBanner from "./status-banner";
import UnparsedCard from "./unparsed-card";
import { useBankSync } from "./use-bank-sync";
import { useTotalSpent } from "./use-total-spent";

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
	const { status, isPending, startTransition, sync, rescan } = useBankSync();
	const totalSpent = useTotalSpent(transactions);

	if (!configured) {
		return (
			<PageContainer className="max-w-4xl">
				{status?.needsReauth && <StatusBanner status={status} />}
				<ConnectCard />
			</PageContainer>
		);
	}

	return (
		<PageContainer className="max-w-4xl">
			<div className="flex justify-between items-center gap-2 flex-wrap">
				<p className="text-sm text-muted-foreground">
					{email ? `Connected as ${email}` : "Connected to Gmail"}
				</p>
				<div className="flex gap-2">
					<Button
						onClick={rescan}
						disabled={isPending}
						size="sm"
						variant="outline"
						title="Re-read every bank email from scratch, ignoring the sync cursor. Recovers anything a normal sync missed."
					>
						<SearchCheck className="mr-2 h-4 w-4" />
						Deep rescan
					</Button>
					<Button onClick={sync} disabled={isPending} size="sm">
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
						<Money
							value={totalSpent}
							className="text-2xl font-bold text-destructive tabular-nums"
						/>
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

			<PendingReviewCard
				transactions={transactions}
				startTransition={startTransition}
			/>

			<BankHistoryCard
				transactions={transactions}
				emptyMessage={
					senderConfigs.some((c) => c.enabled)
						? 'No transactions yet. Click "Sync bank emails" to import them.'
						: "Add an active bank sender above, then sync to import transactions."
				}
			/>
		</PageContainer>
	);
}
