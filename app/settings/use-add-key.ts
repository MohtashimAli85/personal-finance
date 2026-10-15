import { useState } from "react";
import { saveApiKey } from "@/app/actions/settings/mutations";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { detectProvider } from "@/lib/ai/detect-provider";
import type { AiProvider } from "@/lib/settings";

export function useAddKey() {
	const [apiKey, setApiKey] = useState("");
	const [chosen, setChosen] = useState<AiProvider | null>(null);
	const { feedback, isPending, clear, run } = useActionFeedback(
		(errors) => errors?.apiKey?.message,
	);
	const provider = chosen ?? detectProvider(apiKey);

	const save = () => {
		if (!provider) return;
		clear();
		run(
			() => saveApiKey({ success: false }, { provider, apiKey }),
			() => {
				setApiKey("");
				setChosen(null);
			},
		);
	};

	return {
		apiKey,
		setApiKey,
		provider,
		setChosen,
		feedback,
		isPending,
		save,
	};
}
