import { toast } from "sonner";

export const actionError = (result: ActionState) =>
	result.message ??
	Object.values(result.errors ?? {}).find(Boolean)?.message ??
	"Something went wrong.";

export async function toastOnError(pending: Promise<ActionState>) {
	const result = await pending;
	if (!result.success) toast.error(actionError(result));
	return result;
}
