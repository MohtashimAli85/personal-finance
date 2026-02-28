import { useRef } from "react";

export function useInlineEdit(onSave?: (value: string) => void) {
	const containerRef = useRef<HTMLDivElement>(null);

	const startEditing = () => {
		if (!containerRef.current) return;

		const editEl =
			containerRef.current.querySelector<HTMLElement>("[data-edit]");
		const viewEl =
			containerRef.current.querySelector<HTMLElement>("[data-view]");

		if (editEl && viewEl) {
			viewEl.hidden = true;
			editEl.hidden = false;

			if (
				editEl instanceof HTMLInputElement ||
				editEl instanceof HTMLTextAreaElement
			) {
				setTimeout(() => editEl.select(), 300);
			} else {
				setTimeout(() => editEl.focus(), 300);
			}
		}
	};

	const handleBlur = () => {
		if (!containerRef.current) return;

		const editEl =
			containerRef.current.querySelector<HTMLInputElement>("[data-edit]");
		const viewEl =
			containerRef.current.querySelector<HTMLElement>("[data-view]");

		if (editEl && viewEl) {
			editEl.hidden = true;
			viewEl.hidden = false;
			editEl.value = viewEl.textContent || ""; // Reset on cancel
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
		if (e.key === "Enter" || e.key === "NumpadEnter") {
			const value = (e.target as HTMLInputElement).value.trim();
			if (value) {
				e.currentTarget.closest("form")?.requestSubmit(); // Optional

				if (onSave) onSave(value);

				// Update view instantly
				const viewEl =
					containerRef.current?.querySelector<HTMLElement>("[data-view]");
				if (viewEl) viewEl.textContent = value;
			}
			handleBlur();
		}
		if (e.key === "Escape") {
			handleBlur();
		}
	};

	return { containerRef, startEditing, handleBlur, handleKeyDown };
}
