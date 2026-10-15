"use client";

import { AlertCircle, KeyRound, ShieldCheck } from "lucide-react";
import PageContainer from "@/components/page-container";
import ActualImportCard from "@/components/settings/actual-import-card";
import BackupCard from "@/components/settings/backup-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/lib/profile-schema";
import type { AiKeyStatus } from "@/lib/settings";
import AddKeyCard from "./add-key-card";
import ProfileCard from "./profile-card";
import ProviderCard from "./provider-card";
import { PROVIDERS } from "./providers";

export default function SettingsClient({
	status,
	profile,
}: {
	status: AiKeyStatus;
	profile: Profile;
}) {
	return (
		<PageContainer className="max-w-2xl">
			<ProfileCard profile={profile} />

			<BackupCard />

			<ActualImportCard />

			<h2 className="flex items-center gap-2 text-lg font-semibold">
				<KeyRound className="h-5 w-5" />
				AI providers
			</h2>
			<p className="-mt-4 text-sm text-muted-foreground">
				Keys are encrypted before they are saved and are never sent back to this
				page.
			</p>

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
							<code className="font-mono">GEMINI_API_KEY</code> /{" "}
							<code className="font-mono">ANTHROPIC_API_KEY</code> /{" "}
							<code className="font-mono">OPENAI_API_KEY</code> directly.
						</p>
					</CardContent>
				</Card>
			)}

			<div className="space-y-4">
				<AddKeyCard canStore={status.canStore} />
				{PROVIDERS.map((provider) => (
					<ProviderCard
						key={provider.id}
						provider={provider}
						source={status.providers[provider.id]}
					/>
				))}
			</div>
		</PageContainer>
	);
}
