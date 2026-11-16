import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Feedback } from "@/hooks/use-action-feedback";

export default function FeedbackText({ feedback }: { feedback: Feedback }) {
	if (!feedback?.text) return null;

	if (feedback.tone === "error") {
		return (
			<Alert variant="destructive">
				<AlertCircle />
				<AlertDescription>{feedback.text}</AlertDescription>
			</Alert>
		);
	}

	return (
		<output className="flex items-center gap-1.5 text-sm text-positive">
			<CheckCircle2 className="size-4 shrink-0" />
			{feedback.text}
		</output>
	);
}
