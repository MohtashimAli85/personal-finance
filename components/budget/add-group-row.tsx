"use client";
import { Plus } from "lucide-react";
import { useState } from "react";
import { createBudgetGroup } from "@/app/actions/budget/mutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { toastOnError } from "@/lib/action-result";
import { SPENT_CELL } from "./budget-cells";

const AddGroupRow = () => {
	const [adding, setAdding] = useState(false);

	return (
		<TableRow>
			<TableCell>
				{adding ? (
					<Input
						variant="table"
						placeholder="New group name"
						defaultValue=""
						onBlur={(e) => {
							const name = e.currentTarget.value.trim();
							setAdding(false);
							if (name) toastOnError(createBudgetGroup(name));
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter") e.currentTarget.blur();
							if (e.key === "Escape") {
								e.currentTarget.value = "";
								setAdding(false);
							}
						}}
						autoFocus
					/>
				) : (
					<Button
						type="button"
						variant="table"
						size="sm"
						onClick={() => setAdding(true)}
					>
						<Plus />
						Add group
					</Button>
				)}
			</TableCell>
			<TableCell />
			<TableCell className={SPENT_CELL} />
			<TableCell />
		</TableRow>
	);
};

export default AddGroupRow;
