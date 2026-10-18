"use client";

import { Loader2, RefreshCw, Unplug } from "lucide-react";
import type {
	BankSenderConfig,
	UnparsedEmail,
} from "@/app/actions/bank/sender-config";
import BankHistoryCard from "@/components/bank-transactions/bank-history-card";
import { Money } from "@/components/money";
import PageContainer from "@/components/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BankTransactionRow } from "@/lib/bank-transaction";
import ConnectCard from "./connect-card";
import PendingReviewCard from "./pending-review-card";
import SenderConfigCard from "./sender-config-card";
import StatusBanner from "./status-banner";
import UnparsedCard from "./unparsed-card";
import { useBankSync } from "./use-bank-sync";
import { useDisconnectMail } from "./use-disconnect-mail";
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
	const { status, isPending, isRefining, startTransition, sync } =
		useBankSync();
	const totalSpent = useTotalSpent(transactions);
	const { isDisconnecting, disconnect } = useDisconnectMail();

	if (!configured) {
		return (
			<PageContainer className="max-w-4xl">
				<ConnectCard />
			</PageContainer>
		);
	}

	return (
		<PageContainer className="max-w-4xl">
			<div className="flex justify-between items-center gap-2 flex-wrap">
				<p className="text-sm text-muted-foreground">Connected as {email}</p>
				<div className="flex items-center gap-2">
					{isRefining && (
						<p className="flex items-center gap-2 text-sm text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" />
							Improving names with AI…
						</p>
					)}
					<Button onClick={sync} disabled={isPending} size="sm">
						{isPending ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<RefreshCw className="mr-2 h-4 w-4" />
						)}
						Sync bank emails
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={disconnect}
						disabled={isDisconnecting}
					>
						<Unplug className="mr-2 h-4 w-4" />
						Disconnect
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
