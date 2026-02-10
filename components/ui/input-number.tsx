import * as React from "react";
import { Input, InputProps } from "../ui/input";
import { cn } from "@/lib/tailwindcss/utils";
interface InputNumberProps extends Omit<InputProps, "onChange"> {
  onChange?: (value: string) => void;
}
export const InputNumber: React.FC<InputNumberProps> = (props) => {
  const validateNumberFormat = (value: string): boolean => {
    if (!value) return true;
    // Allow digits with an optional single decimal point and optional fractional digits.
    // Accept intermediate states like "." or "1." so typing isn't blocked.
    const pattern = /^\d*(\.\d*)?$/;
    return pattern.test(value);
  };

  return (
    <Input
      {...props}
      className={cn("text-right", props.className)}
      type="text"
      inputMode={props.inputMode ?? "decimal"}
      pattern={props.pattern ?? "[0-9]*[.]?[0-9]*"}
      onFocus={(e) => {
        e.target.select();
      }}
      onChange={(e) => {
        const rawValue = e.target.value;
        // Reject spaces explicitly
        if (rawValue.includes(" ")) return;
        // Reject anything that doesn't match the decimal format (allows intermediate states)
        if (!validateNumberFormat(rawValue)) return;
        // If valid, propagate the change
        props.onChange?.(rawValue);
      }}
    />
  );
};
