declare global {
	interface Account {
		id: string;
		name: string;
		balance: number;
		account_type: "on_budget" | "off_budget";
		created_at: string;
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
	interface Transaction {
		id: string;
		payment: number | undefined;
		deposit: number | undefined;
		date: string;
		notes: string | undefined;
		account_id: string;
		category_id: string;
	}
	interface TransactionRow extends Transaction {
		account_name: string;
		category_name: string | undefined;
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

	interface BudgetCategoryRow {
		id: string;
		name: string;
		group_id: string;
		budgeted: number;
		activity: number;
		balance: number;
	}

	interface BudgetGroup {
		id: string;
		name: string;
		sort_order?: number;
		is_income?: boolean;
		can_delete?: boolean;
		categories: BudgetCategoryRow[];
	}

	interface BudgetView {
		month: string;
		totalBalance: number;
		totalBudgeted: number;
		toBudget: number;
		groups: BudgetGroup[];
	}

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
