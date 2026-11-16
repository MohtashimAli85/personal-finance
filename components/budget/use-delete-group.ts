import { useState } from "react";
import { deleteBudgetGroup } from "@/app/actions/budget/mutations";
import { useServerAction } from "@/hooks/use-server-action";

export function useDeleteGroup(groupId: string) {
	const [open, setOpen] = useState(false);
	const { run } = useServerAction();

	return {
		open,
		setOpen,
		request: () => setOpen(true),
		confirm: () => run(() => deleteBudgetGroup(groupId)),
	};
}
