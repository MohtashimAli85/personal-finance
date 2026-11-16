"use client";

import { Settings2, Unplug } from "lucide-react";
import type { BankSenderConfig } from "@/app/actions/bank/sender-config";
import ConfirmDialog from "@/components/confirm-dialog";
import PageSection from "@/components/page-section";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import SenderConfig from "./sender-config";
import { useDisconnectMail } from "./use-disconnect-mail";

export default function SendersSheet({
	email,
	configs,
	open,
	onOpenChange,
}: {
	email: string | null;
	configs: BankSenderConfig[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { isDisconnecting, disconnect } = useDisconnectMail();

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetTrigger asChild>
				<Button variant="outline">
					<Settings2 />
					<span className="max-sm:sr-only">Senders</span>
				</Button>
			</SheetTrigger>
			<SheetContent className="w-full overflow-y-auto sm:max-w-md">
				<SheetHeader>
					<SheetTitle>Bank email settings</SheetTitle>
					<SheetDescription>
						Choose which senders to import from, and manage the Gmail
						connection.
					</SheetDescription>
				</SheetHeader>
				<div className="flex flex-col gap-8 px-4 pb-6">
					<PageSection
						title="Senders"
						description="Only emails from these addresses are read. Each one imports into its own account."
					>
						<SenderConfig configs={configs} />
					</PageSection>
					<PageSection
						title="Gmail"
						description={`Connected as ${email}. Disconnecting stops syncing and removes the saved app password. Imported transactions stay.`}
					>
						<ConfirmDialog
							title="Disconnect Gmail?"
							description="Syncing stops and the saved app password is removed. Transactions already imported stay."
							confirmLabel="Disconnect"
							onConfirm={disconnect}
							trigger={
								<Button
									variant="destructive"
									className="self-start"
									disabled={isDisconnecting}
								>
									<Unplug />
									Disconnect Gmail
								</Button>
							}
						/>
					</PageSection>
				</div>
			</SheetContent>
		</Sheet>
	);
}
