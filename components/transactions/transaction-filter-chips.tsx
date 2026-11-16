"use client";

import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTransactionFilters } from "./use-transaction-filters";

export default function TransactionFilterChips() {
	const { chips } = useTransactionFilters();
	return chips.map((chip) => (
		<Button
			key={chip.key}
			variant="secondary"
			size="sm"
			onClick={chip.clear}
			aria-label={`Remove filter: ${chip.label}`}
		>
			{chip.label}
			<XIcon data-icon="inline-end" />
		</Button>
	));
}
