import { Loader2 } from "lucide-react";
import ConfirmDialog from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ApiKeySource } from "@/lib/settings";
import FeedbackText from "./feedback-text";
import { type ProviderInfo, SOURCE_BADGE } from "./providers";
import { useProviderKey } from "./use-provider-key";

export default function ProviderCard({
	provider,
	source,
	canStore,
}: {
	provider: ProviderInfo;
	source: ApiKeySource;
	canStore: boolean;
}) {
	const { apiKey, setApiKey, feedback, isPending, save, test, remove } =
		useProviderKey(provider.id);
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
				{source === "env" ? (
					<p className="text-sm text-muted-foreground">
						This key comes from an environment variable and can only be changed
						there.
					</p>
				) : (
					<form
						className="flex gap-2"
						onSubmit={(event) => {
							event.preventDefault();
							save();
						}}
					>
						<Input
							type="password"
							autoComplete="off"
							placeholder={
								source === "stored"
									? "Enter a new key to replace"
									: provider.placeholder
							}
							value={apiKey}
							onChange={(event) => setApiKey(event.target.value)}
							disabled={!canStore || isPending}
						/>
						<Button type="submit" disabled={!canStore || isPending || !apiKey}>
							Save
						</Button>
					</form>
				)}

				<div className="flex flex-wrap items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={!hasUsableKey || isPending}
						onClick={test}
					>
						{isPending && <Loader2 className="h-4 w-4 animate-spin" />}
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
