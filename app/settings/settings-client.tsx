"use client";

import { AlertCircle, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";
import {
	clearApiKey,
	saveApiKey,
	testAiConnection,
} from "@/app/actions/settings/mutations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AiKeyStatus, AiProvider, ApiKeySource } from "@/lib/settings";

const PROVIDERS: {
	id: AiProvider;
	name: string;
	description: string;
	placeholder: string;
	keyUrl: string;
}[] = [
	{
		id: "groq",
		name: "Groq",
		description: "Primary model: GPT-OSS 120B, falling back to GPT-OSS 20B.",
		placeholder: "gsk_...",
		keyUrl: "https://console.groq.com/keys",
	},
	{
		id: "gemini",
		name: "Google Gemini",
		description: "Fallback when Groq is unavailable or rate limited.",
		placeholder: "AIza...",
		keyUrl: "https://aistudio.google.com/apikey",
	},
];

const SOURCE_BADGE: Record<
	ApiKeySource,
	{
		label: string;
		variant: "default" | "secondary" | "destructive" | "outline";
	}
> = {
	env: { label: "Set via environment", variant: "secondary" },
	stored: { label: "Saved (encrypted)", variant: "default" },
	unreadable: { label: "Can't decrypt - re-enter", variant: "destructive" },
	none: { label: "Not set", variant: "outline" },
};

type Feedback = { tone: "success" | "error"; text: string } | null;

function ProviderCard({
	provider,
	source,
	canStore,
}: {
	provider: (typeof PROVIDERS)[number];
	source: ApiKeySource;
	canStore: boolean;
}) {
	const [apiKey, setApiKey] = useState("");
	const [feedback, setFeedback] = useState<Feedback>(null);
	const [isPending, startTransition] = useTransition();
	const badge = SOURCE_BADGE[source];
	const hasUsableKey = source === "env" || source === "stored";

	const run = (action: () => Promise<ActionState>, onSuccess?: () => void) => {
		setFeedback(null);
		startTransition(async () => {
			const result = await action();
			const fieldError = result.errors?.apiKey?.message;
			setFeedback({
				tone: result.success ? "success" : "error",
				text: fieldError ?? result.message ?? "",
			});
			if (result.success) onSuccess?.();
		});
	};

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
							run(
								() =>
									saveApiKey(
										{ success: false },
										{ provider: provider.id, apiKey },
									),
								() => setApiKey(""),
							);
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
						onClick={() => run(() => testAiConnection(provider.id))}
					>
						{isPending && <Loader2 className="h-4 w-4 animate-spin" />}
						Test connection
					</Button>
					{(source === "stored" || source === "unreadable") && (
						<Button
							variant="ghost"
							size="sm"
							disabled={isPending}
							onClick={() => run(() => clearApiKey(provider.id))}
						>
							Remove key
						</Button>
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

				{feedback?.text && (
					<p
						className={
							feedback.tone === "success"
								? "text-sm text-emerald-500"
								: "text-sm text-destructive"
						}
					>
						{feedback.text}
					</p>
				)}
			</CardContent>
		</Card>
	);
}

export default function SettingsClient({ status }: { status: AiKeyStatus }) {
	return (
		<div className="max-w-2xl w-full mx-auto p-6 space-y-6 overflow-auto">
			<div>
				<h1 className="text-2xl font-bold">Settings</h1>
				<p className="text-sm text-muted-foreground">
					API keys for the AI coach. Keys are encrypted before they are saved
					and are never sent back to this page.
				</p>
			</div>

			{status.canStore ? (
				<p className="flex items-center gap-2 text-sm text-muted-foreground">
					<ShieldCheck className="h-4 w-4 text-emerald-500" />
					Encryption is set up. Keys are stored with AES-256-GCM.
				</p>
			) : (
				<Card className="border-amber-500/40">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base text-amber-600">
							<AlertCircle className="h-4 w-4" />
							Secure key storage isn&apos;t available
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-sm text-muted-foreground">
						<p>
							No encryption key is configured, so API keys can&apos;t be saved
							here. On a self-hosted server, set{" "}
							<code className="font-mono">APP_SECRET_KEY</code> (generate one
							with <code className="font-mono">openssl rand -hex 32</code>) and
							restart. Alternatively set{" "}
							<code className="font-mono">GROQ_API_KEY</code> /{" "}
							<code className="font-mono">GEMINI_API_KEY</code> directly.
						</p>
					</CardContent>
				</Card>
			)}

			<div className="space-y-4">
				<h2 className="flex items-center gap-2 text-lg font-semibold">
					<KeyRound className="h-5 w-5" />
					AI providers
				</h2>
				{PROVIDERS.map((provider) => (
					<ProviderCard
						key={provider.id}
						provider={provider}
						source={status.providers[provider.id]}
						canStore={status.canStore}
					/>
				))}
			</div>
		</div>
	);
}
