import { fetchData } from "@/lib/helper";

export const fetchAccounts = async () => fetchData<Account[]>("accounts");

export const fetchCategories = async () =>
	fetchData<GroupedCategory[]>("categories");

export const fetchTransactions = async (
	params: Record<string, string | number | undefined>,
) => fetchData<TransactionRow[]>("transactions", params);
