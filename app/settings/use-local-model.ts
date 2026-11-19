import { useEffect, useState } from "react";
import {
	deleteLocalModel,
	downloadLocalModel,
	getLocalModelStatus,
} from "@/app/actions/settings/mutations";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import type { LocalModelStatus } from "@/lib/local-ai/download";
import {
	findLocalModel,
	LOCAL_MODELS,
	type LocalModelId,
} from "@/lib/local-ai/models";

export const megabytes = (bytes: number) => `${Math.round(bytes / 1e6)} MB`;

export function useLocalModel(initial: LocalModelStatus) {
	const [status, setStatus] = useState(initial);
	const { feedback, isPending, clear, run } = useActionFeedback(
		() => undefined,
	);

	useEffect(() => {
		if (!status.downloading) return;
		const timer = setInterval(async () => {
			setStatus(await getLocalModelStatus());
		}, 1000);
		return () => clearInterval(timer);
	}, [status.downloading]);

	const download = (id: LocalModelId) => {
		clear();
		run(
			() => downloadLocalModel(id),
			() =>
				setStatus((s) => ({
					...s,
					downloading: id,
					received: 0,
					total: findLocalModel(id).size,
					error: null,
				})),
		);
	};

	const remove = () => {
		clear();
		run(
			() => deleteLocalModel(undefined),
			() => setStatus((s) => ({ ...s, installed: null })),
		);
	};

	return {
		status,
		models: LOCAL_MODELS,
		busy: isPending || status.downloading !== null,
		percent: status.total
			? Math.round((status.received / status.total) * 100)
			: 0,
		progressLabel: `${megabytes(status.received)} of ${megabytes(status.total)}`,
		feedback,
		download,
		remove,
	};
}
