import { useTransition } from "react";
import { disconnectMail } from "@/app/actions/bank/mutations";

export function useDisconnectMail() {
	const [isDisconnecting, startTransition] = useTransition();
	const disconnect = () => startTransition(() => disconnectMail());
	return { isDisconnecting, disconnect };
}
