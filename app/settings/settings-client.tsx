"use client";

import { AlertCircle, ShieldCheck } from "lucide-react";
import PageContainer from "@/components/page-container";
import PageHeader from "@/components/page-header";
import PageSection from "@/components/page-section";
import ActualImportCard from "@/components/settings/actual-import-card";
import BackupCard from "@/components/settings/backup-card";
import EraseDataCard from "@/components/settings/erase-data-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Profile } from "@/lib/profile-schema";
import type { AiKeyStatus } from "@/lib/settings";
import AddKeyCard from "./add-key-card";
import AppearanceSetting from "./appearance-setting";
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
		<PageContainer className="max-w-2xl gap-10">
			<PageHeader title="Settings" />

			<PageSection
				title="Appearance"
				description="System follows your computer's light or dark setting."
			>
				<AppearanceSetting />
			</PageSection>

			<PageSection
				title="Profile"
				description="What the AI coach knows about you and how it talks to you."
			>
				<ProfileCard profile={profile} />
			</PageSection>

			<PageSection
				title="Your data"
				description="Back up everything to a file, restore a backup, or move over from Actual Budget."
			>
				<BackupCard />
				<ActualImportCard />
			</PageSection>

			<PageSection
				title="AI providers"
				description="Keys are encrypted before they are saved and are never sent back to this page."
			>
				{status.canStore ? (
					<p className="flex items-center gap-2 text-sm text-muted-foreground">
						<ShieldCheck className="size-4 text-positive" />
						Encryption is set up. Keys are stored with AES-256-GCM.
					</p>
				) : (
					<Alert className="border-warning/40 text-warning">
						<AlertCircle />
						<AlertTitle>Secure key storage isn&apos;t available</AlertTitle>
						<AlertDescription>
							<p>
								No encryption key is configured, so API keys can&apos;t be saved
								here. On a self-hosted server, set{" "}
								<code className="font-mono">APP_SECRET_KEY</code> (generate one
								with <code className="font-mono">openssl rand -hex 32</code>)
								and restart. Alternatively set{" "}
								<code className="font-mono">GROQ_API_KEY</code> /{" "}
								<code className="font-mono">GEMINI_API_KEY</code> /{" "}
								<code className="font-mono">ANTHROPIC_API_KEY</code> /{" "}
								<code className="font-mono">OPENAI_API_KEY</code> directly.
							</p>
						</AlertDescription>
					</Alert>
				)}
				<AddKeyCard canStore={status.canStore} />
				{PROVIDERS.map((provider) => (
					<ProviderCard
						key={provider.id}
						provider={provider}
						source={status.providers[provider.id]}
					/>
				))}
			</PageSection>

			<PageSection
				title="Danger zone"
				description="Start over with an empty app."
			>
				<EraseDataCard />
			</PageSection>
		</PageContainer>
	);
}
