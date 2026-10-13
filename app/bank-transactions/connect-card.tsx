import { Chrome } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function googleLoginHref() {
	const isElectron =
		typeof window !== "undefined" && Boolean(window.electronAPI?.isElectron);
	return `/api/auth/google/login?source=${isElectron ? "desktop" : "web"}`;
}

export default function ConnectCard() {
	return (
		<Card className="max-w-xl w-full mx-auto">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-lg">
					<Chrome className="h-5 w-5" />
					Connect your Gmail
				</CardTitle>
				<p className="text-sm text-muted-foreground">
					The app reads bank alert emails from your inbox to import transactions
					automatically. Sign in with Google to grant Gmail read-only access.
				</p>
			</CardHeader>
			<CardContent className="space-y-5">
				<ol className="space-y-2 text-sm list-decimal list-inside text-muted-foreground">
					<li>You&apos;ll be redirected to Google&apos;s consent screen.</li>
					<li>Approve Gmail read-only access for the app.</li>
					<li>You&apos;ll be brought back here, connected.</li>
				</ol>

				<a
					href={googleLoginHref()}
					className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-foreground text-background text-sm font-medium hover:opacity-90"
				>
					<Chrome className="h-4 w-4" />
					Sign in with Google
				</a>
			</CardContent>
		</Card>
	);
}
