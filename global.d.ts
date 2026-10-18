declare global {
	/** All money fields are integer cents (see lib/money.ts). */
	interface Account {
		id: string;
		name: string;
		balance: number;
		account_type: "on_budget" | "off_budget";
		closed_at: string | null;
		created_at: string | null;
	}
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
	interface Transaction {
		id: string;
		payment: number | null;
		deposit: number | null;
		date: string;
		notes: string | null;
		account_id: string | null;
		category_id: string | null;
		source?: string;
		status?: "pending" | "cleared";
		transfer_id?: string | null;
	}
	interface TransactionRow extends Transaction {
		account_name: string | null;
		category_name: string | null;
	}
	interface ActionState {
		success: boolean;
		message?: string;
		shouldValidate?: boolean;
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

export {};
