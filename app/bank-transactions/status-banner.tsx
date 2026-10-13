import { AlertCircle, CheckCircle2 } from "lucide-react";

export interface SyncStatus {
	tone: "success" | "error";
	text: string;
	needsReauth?: boolean;
}

export default function StatusBanner({ status }: { status: SyncStatus }) {
	return (
		<output
			aria-live="polite"
			className={`flex w-full items-start gap-2 rounded-md border px-3 py-2 text-sm ${
				status.tone === "error"
					? "border-destructive/30 bg-destructive/10 text-destructive"
					: "border-emerald-600/30 bg-emerald-600/10 text-emerald-600"
			}`}
		>
			{status.tone === "error" ? (
				<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
			) : (
				<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
			)}
			<span className="flex-1">{status.text}</span>
		</output>
	);
}
