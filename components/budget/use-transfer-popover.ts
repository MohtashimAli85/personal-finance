import { useRef, useState } from "react";

export function useTransferPopover() {
	const [open, setOpen] = useState(false);
	const requested = useRef(false);

	return {
		open,
		setOpen,
		request: () => {
			requested.current = true;
		},
		onMenuCloseAutoFocus: (event: Event) => {
			if (!requested.current) return;
			requested.current = false;
			event.preventDefault();
			setOpen(true);
		},
	};
}
