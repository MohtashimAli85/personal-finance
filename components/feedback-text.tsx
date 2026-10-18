import type { Feedback } from "@/hooks/use-action-feedback";

export default function FeedbackText({ feedback }: { feedback: Feedback }) {
	if (!feedback?.text) return null;
	return (
		<p
			className={
				feedback.tone === "success"
					? "text-sm text-emerald-500"
					: "text-sm text-destructive"
			}
		>
			{feedback.text}
		</p>
	);
}
