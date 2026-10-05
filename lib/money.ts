/**
 * Money is stored and computed as integer minor units (cents/paisa) so that
 * running-total arithmetic (account balances, budget carryover) cannot drift
 * the way repeated floating-point addition does. Convert to/from a decimal
 * "display" value only at the edges: form inputs, CSV/email parsing, and
 * rendering.
 */

export function toCents(value: unknown): number {
	const num = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(num)) return 0;
	return Math.round(num * 100);
}

export function fromCents(cents: unknown): number {
	const num = typeof cents === "number" ? cents : Number(cents);
	if (!Number.isFinite(num)) return 0;
	return num / 100;
}

export function formatMoney(
	cents: unknown,
	options?: { currency?: string; locale?: string },
): string {
	const value = fromCents(cents);
	try {
		if (options?.currency) {
			return new Intl.NumberFormat(options.locale ?? "en-US", {
				style: "currency",
				currency: options.currency,
				maximumFractionDigits: 2,
			}).format(value);
		}
		return new Intl.NumberFormat(options?.locale ?? "en-US", {
			maximumFractionDigits: 2,
			minimumFractionDigits: 2,
		}).format(value);
	} catch {
		return value.toFixed(2);
	}
}

/** Sums an array of possibly-null cent amounts, ignoring nulls/undefined. */
export function sumCents(values: (number | null | undefined)[]): number {
	return values.reduce<number>((sum, v) => sum + (v ?? 0), 0);
}
