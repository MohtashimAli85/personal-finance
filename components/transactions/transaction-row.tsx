"use client";
import { type TransactionRow } from "@/app/actions/transaction/queries";
import { TableCell, TableRow } from "@/components/ui/table";
import AccountSelector from "@/components/accounts/account-combobox";
import { updateTransactionColumn } from "@/app/actions/transaction/mutations";
import TransactionInput from "./transaction-input";
import { Input } from "../ui/input";
import CategoryCombobox from "../categories/category-combobox";
import { TransactionDatePicker } from "./transaction-date-picker";

const TransactionRow = ({ tx }: { tx: TransactionRow }) => {
  return (
    <TableRow>
      <TableCell>
        <TransactionDatePicker
          date={tx.date}
          onSelect={(date) => updateTransactionColumn(tx.id, "date", date)}
        />
      </TableCell>
      <TableCell>
        <AccountSelector
          value={tx.account_id}
          label={tx.account_name}
          onChange={(value) =>
            updateTransactionColumn(tx.id, "account_id", value)
          }
        />
      </TableCell>
      <TableCell>
        <Input
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
        <TransactionInput id={tx.id} column="payment" value={tx.payment} />
      </TableCell>
      <TableCell className="text-right">
        <TransactionInput id={tx.id} column="deposit" value={tx.deposit} />
      </TableCell>
    </TableRow>
  );
};

export default TransactionRow;
