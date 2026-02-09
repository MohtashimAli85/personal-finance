import * as React from "react";
import { Input } from "../ui/input";
interface InputNumberProps extends Omit<
  React.ComponentProps<"input">,
  "onChange"
> {
  onChange: (value: number | undefined) => void;
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
      value={props.value == null ? "" : String(props.value)}
      type="text"
      inputMode={props.inputMode ?? "decimal"}
      pattern={props.pattern ?? "[0-9]*[.]?[0-9]*"}
      onChange={(e) => {
        const rawValue = e.target.value;
        // Reject spaces explicitly
        if (rawValue.includes(" ")) return;
        // Reject anything that doesn't match the decimal format (allows intermediate states)
        if (!validateNumberFormat(rawValue)) return;
        // If valid, propagate the change
        props.onChange?.(rawValue === "" ? undefined : Number(rawValue));
      }}
    />
  );
};
