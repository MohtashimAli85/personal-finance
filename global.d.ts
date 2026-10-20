import type { accounts, transactions } from "@/lib/db/schema";

declare global {
	/** balance is integer cents, the sum of the account's cleared transactions. */
	type Account = typeof accounts.$inferSelect & { balance: number };
	interface Category {
		id: string;
		name: string;
		group_id: string;
		sort_order?: number;
		hidden?: boolean;
	}
	interface CategoryGroup {
		id: string;
		name: string;
		sort_order?: number;
		is_income?: boolean;
		hidden?: boolean;
	}
	interface GroupedCategory extends CategoryGroup {
		categories: Category[];
	}
	/** payment/deposit are integer cents (see lib/money.ts); date is YYYY-MM-DD. */
	type Transaction = Omit<typeof transactions.$inferSelect, "external_hash">;
	interface TransactionRow extends Transaction {
		account_name: string | null;
		category_name: string | null;
	}
	interface ActionState {
		success: boolean;
		message?: string;
		errors?: Record<string, { message: string } | undefined>;
		payload?: Record<string, string | number | boolean | null>;
	}

	interface Params {
		params: Promise<Record<string, string>>;
	}
	type SearchParams = Record<string, string | undefined>;

	interface SearchPageProps {
		searchParams: Promise<SearchParams>;
	}
	interface PageIdProps {
		params: Promise<Record<string, string>>;
		searchParams: Promise<SearchParams>;
	}

	/** Integer cents, Actual-style signs: spent is negative for outflows.
	 * balance is the envelope balance at the end of the month. */
	interface BudgetCategoryRow {
		id: string;
		name: string;
		group_id: string;
		hidden: boolean;
		budgeted: number;
		spent: number;
		balance: number;
		carryover: boolean;
		in_use: boolean;
	}

	interface BudgetGroup {
		id: string;
		name: string;
		sort_order?: number;
		is_income?: boolean;
		hidden?: boolean;
		can_delete?: boolean;
		categories: BudgetCategoryRow[];
	}

	interface IncomeCategoryRow {
		id: string;
		name: string;
		hidden: boolean;
		received: number;
	}

	/** Actual's envelope budget for one month, integer cents.
	 * toBudget = availableFunds + lastMonthOverspent - budgeted - buffered. */
	interface BudgetView {
		month: string;
		income: number;
		fromLastMonth: number;
		availableFunds: number;
		lastMonthOverspent: number;
		budgeted: number;
		buffered: number;
		toBudget: number;
		spent: number;
		balance: number;
		uncategorizedActivity: number;
		groups: BudgetGroup[];
		incomeGroup: {
			id: string;
			name: string;
			categories: IncomeCategoryRow[];
		} | null;
	}

	/** income/expense are integer cents. */
	interface SummaryResponse {
		income: number;
		expense: number;
	}

	interface Paginated<T> {
		data: T[];
		hasMore: boolean;
	}

	interface ElectronAPI {
		platform: string;
		isElectron: boolean;
	}

	interface Window {
		electronAPI?: ElectronAPI;
	}
}
