"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

export function useChatHistorySheet() {
	const pathname = usePathname();
	const [openPath, setOpenPath] = useState<string | null>(null);

	return {
		open: openPath === pathname,
		setOpen: (open: boolean) => setOpenPath(open ? pathname : null),
	};
}
