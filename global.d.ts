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
	}
	interface CategoryGroup {
		id: string;
		name: string;
		sort_order?: number;
		is_income?: boolean;
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

	/** budgeted/activity/available are integer cents; available is the
	 * cumulative carryover balance through the viewed month. */
	interface BudgetCategoryRow {
		id: string;
		name: string;
		group_id: string;
		budgeted: number;
		activity: number;
		available: number;
	}

	interface BudgetGroup {
		id: string;
		name: string;
		sort_order?: number;
		is_income?: boolean;
		can_delete?: boolean;
		categories: BudgetCategoryRow[];
	}

	/** All amounts are integer cents. */
	interface BudgetView {
		month: string;
		totalBalance: number;
		totalAssignedAllTime: number;
		toBudget: number;
		uncategorizedActivity: number;
		groups: BudgetGroup[];
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

	interface OAuthPayload {
		accessToken: string;
		refreshToken: string | null;
		expiresIn: number | null;
	}

	interface ElectronAPI {
		platform: string;
		isElectron: boolean;
		onOAuthCallback: (callback: (payload: OAuthPayload) => void) => void;
	}

	interface Window {
		electronAPI?: ElectronAPI;
	}
}

export {};
