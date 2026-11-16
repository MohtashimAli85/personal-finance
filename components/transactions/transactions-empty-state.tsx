"use client";

import { ReceiptText, SearchX, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { useStore } from "@/context/store-context";
import { AddTransactionButton } from "./add-transaction";
import { useTransactionFilters } from "./use-transaction-filters";

export default function TransactionsEmptyState() {
	const { filtered, clearAll } = useTransactionFilters();
	const hasAccounts = useStore((s) => s.accounts.length > 0);

	if (filtered) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<SearchX />
					</EmptyMedia>
					<EmptyTitle>No matching transactions</EmptyTitle>
					<EmptyDescription>
						Try a different search, or clear the filters to see everything.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button variant="outline" onClick={clearAll}>
						Clear filters
					</Button>
				</EmptyContent>
			</Empty>
		);
	}

	if (!hasAccounts) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<WalletCards />
					</EmptyMedia>
					<EmptyTitle>Add an account first</EmptyTitle>
					<EmptyDescription>
						Every transaction belongs to an account. Use Add account at the
						bottom of the sidebar to create one.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<Empty>
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<ReceiptText />
				</EmptyMedia>
				<EmptyTitle>No transactions yet</EmptyTitle>
				<EmptyDescription>
					Add one by hand, or import a CSV from your bank.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<AddTransactionButton />
			</EmptyContent>
		</Empty>
	);
}
