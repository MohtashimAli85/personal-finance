"use client";

import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { usePlatformKeys } from "@/hooks/use-platform-keys";

export default function ShortcutKeys({
	keys,
	className,
}: {
	keys: string[];
	className?: string;
}) {
	const platform = usePlatformKeys();

	return (
		<KbdGroup className={className}>
			{platform.keys(keys).map((key) => (
				<Kbd key={key}>{key}</Kbd>
			))}
		</KbdGroup>
	);
}
