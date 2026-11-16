"use client";

import { SearchIcon } from "lucide-react";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { useTransactionSearch } from "./use-transaction-search";

export default function TransactionSearch() {
	const { value, onChange, isPending } = useTransactionSearch();
	return (
		<InputGroup className="w-full max-w-xs">
			<InputGroupInput
				type="search"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder="Search notes, accounts, categories"
				aria-label="Search transactions"
			/>
			<InputGroupAddon align="inline-start">
				<SearchIcon className="text-muted-foreground" />
			</InputGroupAddon>
			{isPending && (
				<InputGroupAddon align="inline-end">
					<Spinner />
				</InputGroupAddon>
			)}
		</InputGroup>
	);
}
