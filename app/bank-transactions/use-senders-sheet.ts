import { useState } from "react";

export function useSendersSheet() {
	const [open, setOpen] = useState(false);
	return { open, setOpen, show: () => setOpen(true) };
}
