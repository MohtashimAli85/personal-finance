import { Cpu } from "lucide-react";
import ConfirmDialog from "@/components/confirm-dialog";
import FeedbackText from "@/components/feedback-text";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "@/components/ui/item";
import { Progress } from "@/components/ui/progress";
import type { LocalModelStatus } from "@/lib/local-ai/download";
import { megabytes, useLocalModel } from "./use-local-model";

export default function LocalModelCard({
	initial,
}: {
	initial: LocalModelStatus;
}) {
	const {
		status,
		models,
		busy,
		percent,
		progressLabel,
		feedback,
		download,
		remove,
	} = useLocalModel(initial);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<Cpu className="size-4" />
					On-device AI
				</CardTitle>
				<p className="text-sm text-muted-foreground">
					No key? Download a model that reads bank emails on this computer. It
					is free, private and works offline, but a key gives better results. It
					is used only when no key is added, and the AI coach still needs a key.
				</p>
			</CardHeader>
			<CardContent className="space-y-3">
				<ItemGroup className="gap-2">
					{models.map((model) => {
						const installed = status.installed === model.id;
						const downloading = status.downloading === model.id;
						return (
							<Item key={model.id} variant="outline">
								<ItemContent>
									<ItemTitle>
										{model.name}
										{installed && <Badge>In use</Badge>}
									</ItemTitle>
									<ItemDescription>
										{model.description} {megabytes(model.size)} download.
									</ItemDescription>
								</ItemContent>
								<ItemActions>
									{installed ? (
										<ConfirmDialog
											title="Remove the on-device model?"
											description="Bank emails won't be read by AI until you download a model again or add a key."
											confirmLabel="Remove model"
											onConfirm={remove}
											trigger={
												<Button variant="ghost" size="sm" disabled={busy}>
													Remove
												</Button>
											}
										/>
									) : (
										<Button
											size="sm"
											variant={status.installed ? "outline" : "default"}
											disabled={busy}
											onClick={() => download(model.id)}
										>
											{status.installed ? "Switch to this" : "Download"}
										</Button>
									)}
								</ItemActions>
								{downloading && (
									<div className="w-full space-y-1">
										<Progress value={percent} />
										<p className="text-xs text-muted-foreground">
											{progressLabel}
										</p>
									</div>
								)}
							</Item>
						);
					})}
				</ItemGroup>

				{status.error && (
					<Alert variant="destructive">
						<AlertDescription>{status.error}</AlertDescription>
					</Alert>
				)}
				<FeedbackText feedback={feedback} />
			</CardContent>
		</Card>
	);
}
