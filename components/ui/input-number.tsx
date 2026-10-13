import type * as React from "react";
import { useExpressionInput } from "@/hooks/use-expression-input";
import { cn } from "@/lib/tailwindcss/utils";
import { Input, type InputProps } from "../ui/input";

interface InputNumberProps extends Omit<InputProps, "onChange"> {
	onChange?: (value: string) => void;
}
export const InputNumber: React.FC<InputNumberProps> = ({
	value,
	defaultValue,
	onChange,
	onBlur,
	onKeyDown,
	...props
}) => {
	const { text, setFocused, invalid, change, commit, isExpression } =
		useExpressionInput({
			value,
			defaultValue,
			onChange,
		});

	return (
		<Input
			data-money
			{...props}
			className={cn("text-right", props.className)}
			type="text"
			inputMode={props.inputMode ?? "decimal"}
			aria-invalid={invalid || props["aria-invalid"]}
			value={text}
			onFocus={(e) => {
				const input = e.target;
				setFocused(true);
				requestAnimationFrame(() => input.select());
			}}
			onChange={(e) => change(e.target.value)}
			onBlur={(e) => {
				if (commit(e.currentTarget)) onBlur?.(e);
				setFocused(false);
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter" && isExpression) {
					e.preventDefault();
					if (!commit(e.currentTarget)) {
						e.stopPropagation();
						return;
					}
				}
				onKeyDown?.(e);
			}}
		/>
	);
};
