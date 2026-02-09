"use client";
import { Account, getAccounts } from "@/app/actions/account";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxProps,
} from "@/components/ui/combobox";
import useQuery from "@/hooks/use-query";
import { useState } from "react";

const AccountCombobox = ({ value, label, onChange }: ComboboxProps) => {
  const { data: accounts } = useQuery<Account[]>({
    queryKey: "accounts",
    queryFn: getAccounts,
  });
  const [inputValue, setInputValue] = useState(label);
  const items = accounts?.map((account) => ({
    value: account.id,
    label: account.name,
  }));
  return (
    <Combobox
      id="accountId"
      name="accountId"
      value={{ value, label }}
      onValueChange={(item) => {
        if (!item) return;
        if (item.value !== value) {
          onChange(item.value);
        }
        setInputValue(item.label);
      }}
      items={items}
    >
      <ComboboxInput
        placeholder="Select an Account"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={() => {
          if (!inputValue) setInputValue(label);
        }}
      />
      <ComboboxContent>
        <ComboboxEmpty>No Accounts found.</ComboboxEmpty>
        <ComboboxList>
          {(account) => (
            <ComboboxItem key={account.value} value={account}>
              {account.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};

export default AccountCombobox;
