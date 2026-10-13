import { formatMoney } from "@/lib/money";

/**
 * Formats a cents value for display. All money read from the database is in
 * integer cents (see lib/money.ts) - this is the shared display formatter
 * used throughout the UI.
 */
export function formatCurrency(cents: number) {
	return formatMoney(cents);
}
