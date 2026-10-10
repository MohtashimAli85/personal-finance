import { useTransition } from "react";
import { setCategoryCarryover } from "@/app/actions/budget/mutations";

export function useCategoryCarryover(categoryId: string, month: string) {
	const [isPending, startTransition] = useTransition();

	const setCarryover = (carryover: boolean) =>
		startTransition(() => setCategoryCarryover(categoryId, month, carryover));

	return { isPending, setCarryover };
}
