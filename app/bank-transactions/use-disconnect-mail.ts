import { disconnectMail } from "@/app/actions/bank/mutations";
import { useServerAction } from "@/hooks/use-server-action";

export function useDisconnectMail() {
	const { isPending: isDisconnecting, run } = useServerAction();
	const disconnect = () => run(() => disconnectMail());
	return { isDisconnecting, disconnect };
}
