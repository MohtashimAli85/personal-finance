import { useState } from "react";
import { evaluateExpression } from "@/lib/math-expression";
import { formatMoney, fromCents, toCents } from "@/lib/money";

const PLAIN_NUMBER = /^\d*(\.\d*)?$/;
const ALLOWED = /^[\d.+\-*/() ]*$/;

export function useExpressionInput({
	value,
	defaultValue,
	onChange,
}: {
	value?: string | number | readonly string[];
	defaultValue?: string | number | readonly string[];
	onChange?: (value: string) => void;
}) {
	const external = value === undefined ? undefined : String(value);
	const [text, setText] = useState(external ?? String(defaultValue ?? ""));
	const [synced, setSynced] = useState(external);
	const [invalid, setInvalid] = useState(false);
	const [focused, setFocused] = useState(false);

	if (external !== synced) {
		setSynced(external);
		if (external !== undefined && Number(external) !== Number(text)) {
			setText(external);
			setInvalid(false);
		}
	}

	const change = (input: string) => {
		const raw = input.replaceAll(",", "");
		if (!ALLOWED.test(raw)) return;
		setText(raw);
		setInvalid(false);
		if (PLAIN_NUMBER.test(raw)) onChange?.(raw);
	};

	const commit = (input: HTMLInputElement) => {
		if (PLAIN_NUMBER.test(text)) return true;
		const result = evaluateExpression(text);
		if (result === null || result < 0) {
			setInvalid(true);
			return false;
		}
		const next = String(fromCents(toCents(result)));
		input.value = next;
		setText(next);
		onChange?.(next);
		return true;
	};

	const isPlain = PLAIN_NUMBER.test(text);

	return {
		text: focused || !isPlain || !text ? text : formatMoney(toCents(text)),
		setFocused,
		invalid,
		change,
		commit,
		isExpression: !isPlain,
	};
}
