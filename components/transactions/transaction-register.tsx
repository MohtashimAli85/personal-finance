import { Money } from "@/components/money";
import PageFigure from "@/components/page-figure";
import PageHeader from "@/components/page-header";
import { Table, TableBody, TableHeader } from "@/components/ui/table";
import TransactionProvider from "@/context/transaction-context";
import { TransactionSelectionProvider } from "@/context/transaction-selection-context";
import { getTransactions, getTransactionTotals } from "@/lib/transaction";
import { AddTransactionButton, AddTransactionRow } from "./add-transaction";
import ExportTransactions from "./export-transactions";
import ImportTransactions from "./import-transactions";
import TransactionDraftSheet from "./transaction-draft-sheet";
import TransactionHead from "./transaction-head";
import TransactionList from "./transaction-list";
import TransactionMobileList from "./transaction-mobile-list";
import TransactionToolbar from "./transaction-toolbar";
import TransactionsEmpty from "./transactions-empty";
import type { TransactionDraftOptions } from "./use-transaction-draft";

export default function TransactionRegister({
	title,
	description,
	balance,
	accountId,
	searchParams,
	draft,
}: {
	title: string;
	description?: string;
	balance: number;
	accountId?: string;
	searchParams: SearchParams;
	draft: TransactionDraftOptions;
}) {
	const filters = { ...searchParams, accountId };
	const { data, hasMore } = getTransactions(filters);
	const totals = getTransactionTotals(filters);
	const showAccountCell = !accountId;

	return (
		<TransactionProvider key={searchParams.new} {...draft}>
			<TransactionSelectionProvider transactions={data}>
				<div className="flex min-h-0 flex-1 flex-col gap-4">
					<PageHeader
						title={title}
						description={description}
						figures={
							<>
								<PageFigure label="Balance">
									<Money value={balance} />
								</PageFigure>
								{totals.pending > 0 && (
									<PageFigure label="Pending review" className="text-warning">
										{totals.pending}
									</PageFigure>
								)}
							</>
						}
					>
						<ImportTransactions accountId={accountId} />
						<ExportTransactions accountId={accountId} />
						<AddTransactionButton />
					</PageHeader>
					<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border">
						<TransactionToolbar totals={totals} />
						<div className="hidden min-h-0 flex-1 flex-col md:flex">
							<Table>
								<TableHeader>
									<TransactionHead showAccountCell={showAccountCell} />
								</TableHeader>
								<TableBody>
									<AddTransactionRow showAccountCell={showAccountCell} />
									<TransactionList
										transactions={data}
										hasMore={hasMore}
										showAccountCell={showAccountCell}
									/>
									{!data.length && (
										<TransactionsEmpty colSpan={showAccountCell ? 7 : 6} />
									)}
								</TableBody>
							</Table>
						</div>
						<TransactionMobileList
							transactions={data}
							hasMore={hasMore}
							showAccount={showAccountCell}
						/>
						<TransactionDraftSheet showAccount={showAccountCell} />
					</div>
				</div>
			</TransactionSelectionProvider>
		</TransactionProvider>
	);
}
