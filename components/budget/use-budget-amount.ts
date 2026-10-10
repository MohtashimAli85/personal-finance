import { setBudgetedAmount } from "@/app/actions/budget/mutations";
import { fromCents } from "@/lib/money";

export function useBudgetAmount(
	categoryId: string,
	month: string,
	budgeted: number,
) {
	const current = fromCents(budgeted);

	const onBlur = (event: React.FocusEvent<HTMLInputElement>) => {
		const next = Number(event.currentTarget.value || 0);
		if (!Number.isNaN(next) && next !== current) {
			setBudgetedAmount(categoryId, month, next);
		}
	};

	const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter") event.currentTarget.blur();
	};

	return { defaultValue: String(current || 0), onBlur, onKeyDown };
}
