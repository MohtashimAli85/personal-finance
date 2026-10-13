import { setBudgetedAmount } from "@/app/actions/budget/mutations";
import { formatCurrency } from "@/lib/helper";
import { evaluateExpression } from "@/lib/math-expression";
import { fromCents, toCents } from "@/lib/money";

export function useBudgetAmount(
	categoryId: string,
	month: string,
	budgeted: number,
) {
	const current = fromCents(budgeted);
	const formatted = formatCurrency(budgeted);

	const onFocus = (event: React.FocusEvent<HTMLInputElement>) => {
		event.currentTarget.value = String(current || "");
		event.currentTarget.select();
	};

	const onBlur = (event: React.FocusEvent<HTMLInputElement>) => {
		const input = event.currentTarget;
		const raw = input.value.replaceAll(",", "").trim();
		const result = raw ? evaluateExpression(raw) : 0;
		input.value = formatted;
		if (result === null) return;
		const next = fromCents(toCents(result));
		if (next !== current) setBudgetedAmount(categoryId, month, next);
	};

	const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter") event.currentTarget.blur();
		if (event.key === "Escape") {
			event.currentTarget.value = String(current || "");
			event.currentTarget.blur();
		}
	};

	return { defaultValue: formatted, onFocus, onBlur, onKeyDown };
}
