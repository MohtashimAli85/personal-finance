"use client";

import AccountCombobox from "@/components/accounts/account-combobox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputNumber } from "@/components/ui/input-number";
import TransactionCategory from "./transaction-category";
import { TransactionDatePicker } from "./transaction-date-picker";

type InputNumberProps = React.ComponentProps<typeof InputNumber>;

export default function TransactionSheetFields({
	date,
	onDateChange,
	account,
	category,
	notes,
	payment,
	deposit,
	resetKeys,
}: {
	date: string;
	onDateChange: (date: string) => void;
	account?: {
		value?: string;
		label?: string;
		onChange: (value: string) => void;
	};
	category: {
		accountId?: string | null;
		value?: string;
		label?: string;
		onChange: (value: string) => void;
	};
	notes: React.ComponentProps<typeof Input>;
	payment: InputNumberProps;
	deposit: InputNumberProps;
	resetKeys?: { notes: string; payment: string; deposit: string };
}) {
	return (
		<FieldGroup className="gap-4">
			<Field>
				<FieldLabel>Date</FieldLabel>
				<TransactionDatePicker
					date={date}
					onSelect={onDateChange}
					variant="outline"
					className="w-full justify-start"
				/>
			</Field>
			{account && (
				<Field>
					<FieldLabel>Account</FieldLabel>
					<AccountCombobox
						value={account.value}
						label={account.label}
						onChange={account.onChange}
					/>
				</Field>
			)}
			<Field>
				<FieldLabel htmlFor="transaction-notes">Notes</FieldLabel>
				<Input
					key={resetKeys?.notes}
					id="transaction-notes"
					placeholder="Notes"
					{...notes}
				/>
			</Field>
			<Field>
				<FieldLabel>Category</FieldLabel>
				<TransactionCategory
					accountId={category.accountId}
					value={category.value}
					label={category.label}
					onChange={category.onChange}
					variant="default"
				/>
			</Field>
			<div className="grid grid-cols-2 gap-3">
				<Field>
					<FieldLabel htmlFor="transaction-payment">Payment</FieldLabel>
					<InputNumber
						key={resetKeys?.payment}
						id="transaction-payment"
						placeholder="0"
						{...payment}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="transaction-deposit">Deposit</FieldLabel>
					<InputNumber
						key={resetKeys?.deposit}
						id="transaction-deposit"
						placeholder="0"
						{...deposit}
					/>
				</Field>
			</div>
		</FieldGroup>
	);
}
