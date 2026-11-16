import type { Metadata } from "next";
import TransactionRegister from "@/components/transactions/transaction-register";
import { getAccounts, getDefaultAccountId } from "@/lib/account";
import { toDateKey } from "@/lib/date";

export const metadata: Metadata = {
	title: "Transactions",
	description: "View and manage all transactions",
};

export default async function Page(props: SearchPageProps) {
	const searchParams = await props.searchParams;
	const today = toDateKey(new Date());
	const { from, to } = searchParams;
	const balance = getAccounts().reduce((sum, a) => sum + a.balance, 0);

	return (
		<TransactionRegister
			title="Transactions"
			description="All accounts"
			balance={balance}
			searchParams={searchParams}
			draft={{
				initialCategoryId: searchParams.draftCategoryId || "",
				initialAccountId:
					searchParams.draftAccountId || getDefaultAccountId() || "",
				initialDate:
					from && (from > today || (to && to <= today)) ? from : undefined,
				autoInitialize: Boolean(searchParams.new),
			}}
		/>
	);
}
