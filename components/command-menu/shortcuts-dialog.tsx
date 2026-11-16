"use client";

import ShortcutKeys from "@/components/shortcut-keys";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { SHORTCUTS } from "@/lib/shortcuts";

export default function ShortcutsDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Keyboard shortcuts</DialogTitle>
					<DialogDescription>
						Single-letter keys work when you're not typing in a field.
					</DialogDescription>
				</DialogHeader>
				<ul className="divide-y">
					{Object.values(SHORTCUTS).map(({ keys, label }) => (
						<li
							key={label}
							className="flex items-center justify-between gap-4 py-2"
						>
							{label}
							<ShortcutKeys keys={keys} />
						</li>
					))}
				</ul>
			</DialogContent>
		</Dialog>
	);
}
