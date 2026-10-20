import { useState } from "react";

interface MutationOptions<T> {
	onSuccess?: (data: T) => void;
	onError?: (data: T) => void;
}

export function useMutation<TInput>(
	action: (payload: TInput) => Promise<ActionState>,
	initialState: ActionState,
) {
	const [state, setState] = useState<ActionState>(initialState);

	const mutate = async (
		payload: TInput,
		options?: MutationOptions<ActionState>,
	) => {
		const result = await action(payload);
		setState(result);

		if (result.success) {
			options?.onSuccess?.(result);
		} else {
			options?.onError?.(result);
		}

		return result;
	};

	return [state, mutate] as const;
}
