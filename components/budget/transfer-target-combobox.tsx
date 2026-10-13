"use client";

import {
	Combobox,
	ComboboxCollection,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxInput,
	ComboboxItem,
	ComboboxLabel,
	ComboboxList,
} from "@/components/ui/combobox";
import { formatCurrency } from "@/lib/helper";
import { cn } from "@/lib/tailwindcss/utils";
import { balanceTone } from "./budget-cells";
import {
	type TransferTarget,
	useTransferTargets,
} from "./use-transfer-targets";

export default function TransferTargetCombobox({
	excludeId,
	value,
	onChange,
}: {
	excludeId: string;
	value: string;
	onChange: (value: string) => void;
}) {
	const groups = useTransferTargets(excludeId);
	const selected =
		groups.flatMap((g) => g.items).find((item) => item.value === value) ?? null;

	return (
		<Combobox
			items={groups}
			value={selected}
			onValueChange={(item: TransferTarget | null) =>
				onChange(item?.value ?? "")
			}
			isItemEqualToValue={(a: TransferTarget, b: TransferTarget) =>
				a.value === b.value
			}
			autoHighlight
		>
			<ComboboxInput
				id="transfer-to"
				placeholder="(none)"
				showTrigger={false}
				className="w-full"
			/>
			<ComboboxContent className="w-64">
				<ComboboxEmpty>No categories found.</ComboboxEmpty>
				<ComboboxList>
					{(group: (typeof groups)[number]) => (
						<ComboboxGroup key={group.id} items={group.items}>
							<ComboboxLabel className="font-medium text-primary">
								{group.name}
							</ComboboxLabel>
							<ComboboxCollection>
								{(item: TransferTarget) => (
									<ComboboxItem key={item.value} value={item} className="pl-4">
										<span className="flex-1 truncate">{item.label}</span>
										<span
											data-money
											className={cn("tabular-nums", balanceTone(item.balance))}
										>
											{formatCurrency(item.balance)}
										</span>
									</ComboboxItem>
								)}
							</ComboboxCollection>
						</ComboboxGroup>
					)}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
}
