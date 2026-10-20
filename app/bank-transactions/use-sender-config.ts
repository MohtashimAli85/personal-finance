import { useState, useTransition } from "react";
import {
	addBankSenderConfigAction,
	type BankSenderConfig,
	removeBankSenderConfigAction,
	setBankSenderConfigEnabledAction,
} from "@/app/actions/bank/sender-config";
import { actionError, toastOnError } from "@/lib/action-result";

export function useSenderConfig() {
	const [isPending, startTransition] = useTransition();
	const [senderEmail, setSenderEmail] = useState("");
	const [accountName, setAccountName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pendingDelete, setPendingDelete] = useState<BankSenderConfig | null>(
		null,
	);

	const handleAdd = () => {
		setError(null);
		startTransition(async () => {
			const result = await addBankSenderConfigAction({
				senderEmail,
				accountName,
			});
			if (result.success) {
				setSenderEmail("");
				setAccountName("");
			} else {
				setError(actionError(result));
			}
		});
	};

	const handleToggle = (id: string, enabled: boolean) => {
		startTransition(async () => {
			await toastOnError(setBankSenderConfigEnabledAction({ id, enabled }));
		});
	};

	const handleRemove = () => {
		if (!pendingDelete) return;
		const id = pendingDelete.id;
		setPendingDelete(null);
		startTransition(async () => {
			await toastOnError(removeBankSenderConfigAction(id));
		});
	};

	return {
		isPending,
		senderEmail,
		setSenderEmail,
		accountName,
		setAccountName,
		error,
		pendingDelete,
		setPendingDelete,
		handleAdd,
		handleToggle,
		handleRemove,
	};
}
