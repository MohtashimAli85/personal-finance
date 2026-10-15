"use client";

import type { FormEvent, KeyboardEvent } from "react";
import { useEffect, useRef } from "react";

export function useChatComposer({
	busy,
	input,
	setInput,
	send,
}: {
	busy: boolean;
	input: string;
	setInput: (value: string) => void;
	send: (text: string) => void;
}) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		if (!busy) textareaRef.current?.focus();
	}, [busy]);

	return {
		textareaRef,
		onChange: (value: string) => setInput(value),
		onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => {
			if (event.key === "Enter" && !event.shiftKey) {
				event.preventDefault();
				send(input);
			}
		},
		onSubmit: (event: FormEvent) => {
			event.preventDefault();
			send(input);
		},
	};
}
