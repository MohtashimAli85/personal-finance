import { useState, useTransition } from "react";

export type Feedback = { tone: "success" | "error"; text: string } | null;

export function useActionFeedback(
	getFieldError: (errors: ActionState["errors"]) => string | undefined,
) {
	const [feedback, setFeedback] = useState<Feedback>(null);
	const [isPending, startTransition] = useTransition();

	const clear = () => setFeedback(null);

	const run = (action: () => Promise<ActionState>, onSuccess?: () => void) => {
		startTransition(async () => {
			const result = await action();
			setFeedback({
				tone: result.success ? "success" : "error",
				text: getFieldError(result.errors) ?? result.message ?? "",
			});
			if (result.success) onSuccess?.();
		});
	};

	return { feedback, isPending, clear, run };
}
