"use client";
import React from "react";
import { InputNumber } from "../ui/input-number";
import { Input } from "../ui/input";
import { updateTransactionColumn } from "@/app/actions/transaction/mutations";
interface TransactionInputProps {
  value?: string | number;
  column: string;
  id: string;
}
const numberFields = ["payment", "deposit"];

const TransactionInput = ({ value, column, id }: TransactionInputProps) => {
  const [inputValue, setValue] = React.useState<string | number>(value ?? "");
  const isNumberField = numberFields.includes(column);
  const onBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = isNumberField ? Number(e.target.value) : e.target.value;
    updateTransactionColumn(id, column, newValue);
  };
  const input = isNumberField ? (
    <InputNumber
      value={inputValue}
      onChange={(e) => setValue(e.target.value)}
      placeholder="0"
      onBlur={onBlur}
      className="text-right"
    />
  ) : (
    <Input
      value={inputValue}
      onChange={(e) => setValue(e.target.value)}
      onBlur={onBlur}
    />
  );

  return <>{input}</>;
};

export default TransactionInput;
