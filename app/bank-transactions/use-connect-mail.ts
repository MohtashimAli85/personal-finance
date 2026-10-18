import { useState } from "react";
import { connectMail } from "@/app/actions/bank/mutations";
import { useActionFeedback } from "@/hooks/use-action-feedback";

export function useConnectMail() {
	const [email, setEmail] = useState("");
	const [appPassword, setAppPassword] = useState("");
	const { feedback, isPending, clear, run } = useActionFeedback(
		(errors) => errors?.email?.message ?? errors?.appPassword?.message,
	);

	const submit = (event: React.FormEvent) => {
		event.preventDefault();
		clear();
		run(
			() => connectMail({ email, appPassword }),
			() => setAppPassword(""),
		);
	};

	return {
		email,
		setEmail,
		appPassword,
		setAppPassword,
		feedback,
		isPending,
		submit,
	};
}
