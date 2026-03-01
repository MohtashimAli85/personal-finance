export function formatCurrency(value: number) {
	try {
		return new Intl.NumberFormat("en-US", {
			maximumFractionDigits: 2,
		}).format(Number(value) || 0);
	} catch {
		return value.toString();
	}
}
export const safeParseFloat = (value: string | null): number => {
	if (!value) {
		return 0;
	}
	const parsed = parseFloat(value);
	return Number.isNaN(parsed) ? 0 : parsed;
};
