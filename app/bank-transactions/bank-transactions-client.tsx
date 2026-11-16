"use client";

import { Inbox, RefreshCw } from "lucide-react";
import type {
	BankSenderConfig,
	UnparsedEmail,
} from "@/app/actions/bank/sender-config";
import BankHistoryCard from "@/components/bank-transactions/bank-history-card";
import { Money } from "@/components/money";
import PageContainer from "@/components/page-container";
import PageFigure from "@/components/page-figure";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import type { BankTransactionRow } from "@/lib/bank-transaction";
import ConnectCard from "./connect-card";
import PendingReviewCard from "./pending-review-card";
import SendersSheet from "./senders-sheet";
import UnparsedCard from "./unparsed-card";
import { useBankSync } from "./use-bank-sync";
import { useMonthSpent } from "./use-month-spent";
import { useSendersSheet } from "./use-senders-sheet";

const TITLE = "Bank transactions";

export default function BankTransactionsClient({
	transactions,
	historyLimited,
	configured,
	email,
	senderConfigs,
	unparsed,
}: {
	transactions: BankTransactionRow[];
	historyLimited: boolean;
	configured: boolean;
	email: string | null;
	senderConfigs: BankSenderConfig[];
	unparsed: UnparsedEmail[];
}) {
	const { isPending, isRefining, startTransition, sync } = useBankSync();
	const monthSpent = useMonthSpent(transactions);
	const senders = useSendersSheet();
	const activeSenders = senderConfigs.filter((c) => c.enabled).length;
	const accepted = transactions.filter((t) => t.status !== "pending");
	const pendingCount = transactions.length - accepted.length;

	if (!configured) {
		return (
			<PageContainer className="max-w-4xl">
				<PageHeader
					title={TITLE}
					description="Import transactions from the alert emails your bank sends."
				/>
				<ConnectCard />
			</PageContainer>
		);
	}

	return (
		<PageContainer className="max-w-4xl">
			<PageHeader
				title={TITLE}
				description={
					activeSenders > 0
						? `Reading alerts from ${activeSenders === 1 ? "1 sender" : `${activeSenders} senders`}`
						: "No active senders"
				}
				figures={
					<>
						{pendingCount > 0 && (
							<PageFigure label="To review" className="text-warning">
								{pendingCount}
							</PageFigure>
						)}
						<PageFigure label="Spent this month">
							<Money value={monthSpent} />
						</PageFigure>
					</>
				}
			>
				<SendersSheet
					email={email}
					configs={senderConfigs}
					open={senders.open}
					onOpenChange={senders.setOpen}
				/>
				<Button onClick={sync} disabled={isPending || activeSenders === 0}>
					{isPending ? <Spinner /> : <RefreshCw />}
					{isPending ? (
						"Syncing…"
					) : (
						<span>
							Sync<span className="max-sm:sr-only"> bank emails</span>
						</span>
					)}
				</Button>
			</PageHeader>

			{isRefining && (
				<p className="-mt-2 flex items-center gap-2 text-sm text-muted-foreground">
					<Spinner />
					Improving transaction names with AI…
				</p>
			)}

			<UnparsedCard emails={unparsed} />

			<PendingReviewCard
				transactions={transactions}
				startTransition={startTransition}
			/>

			{accepted.length > 0 && (
				<BankHistoryCard transactions={accepted} limited={historyLimited} />
			)}

			{transactions.length === 0 && (
				<Empty className="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Inbox />
						</EmptyMedia>
						<EmptyTitle>
							{activeSenders > 0 ? "Nothing imported yet" : "Add a bank sender"}
						</EmptyTitle>
						<EmptyDescription>
							{activeSenders > 0
								? "Sync to read your bank's alert emails and import the transactions."
								: "Tell the app which address your bank sends alerts from, then sync."}
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						{activeSenders > 0 ? (
							<Button onClick={sync} disabled={isPending}>
								{isPending ? <Spinner /> : <RefreshCw />}
								Sync bank emails
							</Button>
						) : (
							<Button onClick={senders.show}>Add a sender</Button>
						)}
					</EmptyContent>
				</Empty>
			)}
		</PageContainer>
	);
}
