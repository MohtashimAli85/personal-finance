declare global {
	interface Account {
		id: string;
		name: string;
		balance: number;
		created_at: string;
	}
	interface Category {
		id: string;
		name: string;
		group_id: string;
	}
	interface CategoryGroup {
		id: string;
		name: string;
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
		payload?: Record<string, string | number | null>;
	}
}

export {};
