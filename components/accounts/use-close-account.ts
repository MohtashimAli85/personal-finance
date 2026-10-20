import { useState } from "react";
import {
	archiveAccount,
	deleteAccount,
} from "@/app/actions/accounts/mutations";
import { useServerAction } from "@/hooks/use-server-action";

export function useCloseAccount(accountId: string) {
	const [transferAccountId, setTransferAccountId] = useState<string>();
	const { isPending, run } = useServerAction();

	const archive = (event: React.FormEvent) => {
		event.preventDefault();
		run(() => archiveAccount({ id: accountId, transferAccountId }));
	};

	const remove = () => run(() => deleteAccount(accountId));

	return {
		transferAccountId,
		setTransferAccountId,
		isPending,
		archive,
		remove,
	};
}
