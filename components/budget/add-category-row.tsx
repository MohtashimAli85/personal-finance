"use client";
import { createBudgetCategory } from "@/app/actions/budget/mutations";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";

const AddCategoryRow = ({
  groupId,
  isAdding,
  onDone,
}: {
  groupId: string;
  isAdding: boolean;
  onDone: () => void;
}) => {
  if (!isAdding) return null;

  return (
    <TableRow>
      <TableCell>
        <Input
          variant="table"
          placeholder="New category name"
          defaultValue=""
          onBlur={(e) => {
            const name = e.currentTarget.value.trim();
            onDone();
            if (name) createBudgetCategory(groupId, name);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              e.currentTarget.value = "";
              onDone();
            }
          }}
          autoFocus
        />
      </TableCell>
      <TableCell />
      <TableCell />
      <TableCell />
    </TableRow>
  );
};

export default AddCategoryRow;
