import { updateTransactionColumn } from "@/app/actions/transaction/mutations";
import { toastOnError } from "@/lib/action-result";

type Edit = Parameters<typeof updateTransactionColumn>[0];

export function useTransactionEdit(id: string) {
	return <C extends Edit["column"]>(
		column: C,
		value: Extract<Edit, { column: C }>["value"],
	) => toastOnError(updateTransactionColumn({ id, column, value } as Edit));
}
