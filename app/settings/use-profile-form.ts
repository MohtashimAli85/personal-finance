import { useState } from "react";
import { saveProfile } from "@/app/actions/settings/mutations";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import type { Profile } from "@/lib/profile-schema";

export function useProfileForm(profile: Profile) {
	const [values, setValues] = useState(profile);
	const { feedback, isPending, clear, run } = useActionFeedback(
		(errors) => Object.values(errors ?? {})[0]?.message,
	);
	const dirty =
		values.name !== profile.name ||
		values.about !== profile.about ||
		values.style !== profile.style;

	const update =
		(field: keyof Profile) =>
		(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			clear();
			setValues((prev) => ({ ...prev, [field]: event.target.value }));
		};

	const submit = (event: React.FormEvent) => {
		event.preventDefault();
		run(() => saveProfile(values));
	};

	return { values, dirty, feedback, isPending, update, submit };
}
