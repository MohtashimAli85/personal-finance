"use client";
import { useState } from "react";
import type { ComboboxProps } from "@/components/ui/combobox";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@/components/ui/combobox";
import { useStore } from "@/context/store-context";

const AccountCombobox = ({
	value,
	label,
	onChange,
	variant = "default",
	modal = false,
}: ComboboxProps) => {
	const accounts = useStore((state) => state.accounts);
	const [inputValue, setInputValue] = useState(label || "");
	const items = accounts?.map((account) => ({
		value: account.id,
		label: account.name,
	}));
	return (
		<Combobox
			modal={modal}
			required
			id="account_id"
			name="account_id"
			value={{ value, label }}
			onValueChange={(item) => {
				if (!item) return;
				if (item.value !== value && item.value) {
					onChange?.(item.value);
				}
				setInputValue(item.label || "");
			}}
			items={items}
		>
			<ComboboxInput
				showTrigger={false}
				variant={variant}
				placeholder="Select an Account"
				value={inputValue}
				onChange={(e) => setInputValue(e.target.value)}
				onBlur={() => {
					if (!inputValue) setInputValue(label || "");
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
