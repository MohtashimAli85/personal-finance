import { setCategoryCarryover } from "@/app/actions/budget/mutations";
import { useServerAction } from "@/hooks/use-server-action";

export function useCategoryCarryover(categoryId: string, month: string) {
	const { isPending, run } = useServerAction();

	const setCarryover = (carryover: boolean) =>
		run(() => setCategoryCarryover({ categoryId, month, carryover }));

	return { isPending, setCarryover };
}
