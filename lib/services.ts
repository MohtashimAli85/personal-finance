import { fetchData } from "@/lib/helper";

export const fetchAccounts = async () => fetchData<Account[]>("accounts");
export const fetchAccountById = async (id: string) =>
	fetchData<Account>(`accounts/${id}`);
export const fetchCategories = async () =>
	fetchData<GroupedCategory[]>("categories");

export const fetchTransactions = async (params: SearchParams) =>
	fetchData<TransactionRow[]>("transactions", params);
export const fetchTransactionsByAccount = async (
	accountId: string,
	params: SearchParams,
) => fetchData<TransactionRow[]>(`transactions/${accountId}`, params);
