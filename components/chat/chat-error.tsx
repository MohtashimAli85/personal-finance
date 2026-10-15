import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

function errorText(error: Error): string {
	try {
		const parsed = JSON.parse(error.message) as { error?: string };
		if (parsed.error) return parsed.error;
	} catch {}
	return error.message || "Something went wrong.";
}

export default function ChatError({
	error,
	onRetry,
}: {
	error: Error;
	onRetry: () => void;
}) {
	const message = errorText(error);
	const needsKey = /api key/i.test(message);
	return (
		<Alert variant="destructive">
			<AlertDescription className="flex flex-col gap-3">
				<span>{message}</span>
				<div className="flex flex-wrap gap-2">
					<Button size="sm" variant="outline" onClick={onRetry}>
						<RotateCcw /> Retry
					</Button>
					{needsKey && (
						<Button asChild size="sm" variant="outline">
							<Link href="/settings">Open Settings</Link>
						</Button>
					)}
				</div>
			</AlertDescription>
		</Alert>
	);
}
