import {
	clearApiKey,
	testAiConnection,
} from "@/app/actions/settings/mutations";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import type { AiProvider } from "@/lib/settings";

export function useProviderKey(provider: AiProvider) {
	const { feedback, isPending, clear, run } = useActionFeedback(
		(errors) => errors?.apiKey?.message,
	);

	const runCleared = (
		action: () => Promise<ActionState>,
		onSuccess?: () => void,
	) => {
		clear();
		run(action, onSuccess);
	};

	const test = () => runCleared(() => testAiConnection(provider));
	const remove = () => runCleared(() => clearApiKey(provider));

	return { feedback, isPending, test, remove };
}
