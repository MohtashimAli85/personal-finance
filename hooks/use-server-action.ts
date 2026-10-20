import { useTransition } from "react";
import { toastOnError } from "@/lib/action-result";

export function useServerAction() {
	const [isPending, startTransition] = useTransition();

	const run = (
		action: () => Promise<ActionState>,
		onSuccess?: (result: ActionState) => void,
	) =>
		startTransition(async () => {
			const result = await toastOnError(action());
			if (result.success) onSuccess?.(result);
		});

	return { isPending, run };
}
