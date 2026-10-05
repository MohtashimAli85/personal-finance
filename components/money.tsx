import { formatCurrency } from "@/lib/helper";

export function Money({ value }: { value: number }) {
	return <span data-money>{formatCurrency(value)}</span>;
}
