"use client";
import { updateTransactionColumn } from "@/app/actions/transaction/mutations";
import AccountSelector from "@/components/accounts/account-combobox";
import { TableCell, TableRow } from "@/components/ui/table";
import { useTransactionSelection } from "@/context/transaction-selection-context";
import CategoryCombobox from "../categories/category-combobox";
import { Input } from "../ui/input";
import { InputNumber } from "../ui/input-number";
import TransactionCheckbox from "./transaction-checkbox";
import { TransactionDatePicker } from "./transaction-date-picker";

const TransactionRow = ({
  tx,
  showAccountCell,
}: {
  tx: TransactionRow;
  showAccountCell?: boolean;
}) => {
  const { isSelected } = useTransactionSelection();
  return (
    <TableRow
      className="group"
      data-state={isSelected(tx.id) ? "selected" : "default"}
    >
      <TableCell className="w-4 pl-2">
        <TransactionCheckbox id={tx.id} />
      </TableCell>
      <TableCell>
        <TransactionDatePicker
          date={tx.date}
          onSelect={(date) => updateTransactionColumn(tx.id, "date", date)}
        />
      </TableCell>
      {showAccountCell && (
        <TableCell>
          <AccountSelector
            variant={"table"}
            value={tx.account_id}
            label={tx.account_name}
            onChange={(value) =>
              updateTransactionColumn(tx.id, "account_id", value)
            }
          />
        </TableCell>
      )}
      <TableCell>
        <Input
          variant={"table"}
          placeholder="Notes"
          value={tx.notes}
          onChange={(e) =>
            updateTransactionColumn(tx.id, "notes", e.target.value)
          }
        />
      </TableCell>
      <TableCell>
        <CategoryCombobox
          value={tx.category_id}
          label={tx.category_name}
          onChange={(value) =>
            updateTransactionColumn(tx.id, "category_id", value)
          }
        />
      </TableCell>
      <TableCell className="text-right">
        <InputNumber
          variant={"table"}
          key={`payment-${tx.payment}`}
          defaultValue={tx.payment}
          placeholder="0"
          onBlur={(e) => {
            if (e.target.value !== String(tx.payment || ""))
              updateTransactionColumn(tx.id, "payment", e.target.value);
          }}
        />
      </TableCell>
      <TableCell className="text-right">
        <InputNumber
          key={`deposit-${tx.deposit}`}
          variant={"table"}
          defaultValue={tx.deposit}
          placeholder="0"
          onBlur={(e) => {
            if (e.target.value !== String(tx.deposit || ""))
              updateTransactionColumn(tx.id, "deposit", e.target.value);
          }}
        />
      </TableCell>
    </TableRow>
  );
};

export default TransactionRow;
