import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
	addBankSenderConfigAction,
	type BankSenderConfig,
	removeBankSenderConfigAction,
	setBankSenderConfigEnabledAction,
} from "@/app/actions/bank/sender-config";

export function useSenderConfig() {
	const router = useRouter();
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
			const result = await addBankSenderConfigAction(senderEmail, accountName);
			if (result.success) {
				setSenderEmail("");
				setAccountName("");
				router.refresh();
			} else {
				setError(result.error);
			}
		});
	};

	const handleToggle = (id: string, enabled: boolean) => {
		startTransition(async () => {
			await setBankSenderConfigEnabledAction(id, enabled);
			router.refresh();
		});
	};

	const handleRemove = () => {
		if (!pendingDelete) return;
		const id = pendingDelete.id;
		setPendingDelete(null);
		startTransition(async () => {
			await removeBankSenderConfigAction(id);
			router.refresh();
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
