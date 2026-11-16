import ConfirmDialog from "@/components/confirm-dialog";
import FeedbackText from "@/components/feedback-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { API_KEY_ENV_VARS } from "@/lib/ai/labels";
import type { ApiKeySource } from "@/lib/settings";
import { type ProviderInfo, SOURCE_BADGE } from "./providers";
import { useProviderKey } from "./use-provider-key";

export default function ProviderCard({
	provider,
	source,
}: {
	provider: ProviderInfo;
	source: ApiKeySource;
}) {
	const { feedback, isPending, test, remove } = useProviderKey(provider.id);
	const badge = SOURCE_BADGE[source];
	const hasUsableKey = source === "env" || source === "stored";

	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between gap-2">
					<div>
						<CardTitle className="text-base">{provider.name}</CardTitle>
						<p className="text-sm text-muted-foreground">
							{provider.description}
						</p>
					</div>
					<Badge variant={badge.variant}>{badge.label}</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{source === "env" && (
					<p className="text-sm text-muted-foreground">
						This key comes from{" "}
						<code className="font-mono text-foreground">
							{API_KEY_ENV_VARS[provider.id]}
						</code>{" "}
						in your environment. It takes priority over a key saved here, so
						change it in your .env file and restart the app.
					</p>
				)}

				<div className="flex flex-wrap items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={!hasUsableKey || isPending}
						onClick={test}
					>
						{isPending && <Spinner />}
						Test connection
					</Button>
					{(source === "stored" || source === "unreadable") && (
						<ConfirmDialog
							title={`Remove your ${provider.name} key?`}
							description="The AI coach won't be able to use this provider until you add a key again."
							confirmLabel="Remove key"
							onConfirm={remove}
							trigger={
								<Button variant="ghost" size="sm" disabled={isPending}>
									Remove key
								</Button>
							}
						/>
					)}
					<a
						href={provider.keyUrl}
						target="_blank"
						rel="noreferrer"
						className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
					>
						Get a key
					</a>
				</div>

				<FeedbackText feedback={feedback} />
			</CardContent>
		</Card>
	);
}
