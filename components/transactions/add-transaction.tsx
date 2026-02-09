"use client";
import { useTransactionContext } from "@/context/transaction-context";
import AccountCombobox from "../accounts/account-combobox";
import CategoryCombobox from "../categories/category-combobox";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { InputNumber } from "../ui/input-number";
import { TableCell, TableRow } from "../ui/table";
import { TransactionDatePicker } from "./transaction-date-picker";
export const AddTransactionButton = () => {
  const { initializeTransaction } = useTransactionContext();
  return <Button onClick={initializeTransaction}>Add Transaction</Button>;
};

export const AddTransactionRow = () => {
  const {
    transaction: tx,
    cancelTransaction,
    updateTransaction,
    addTransaction,
  } = useTransactionContext();
  if (!tx) return null;
  return (
    <>
      <TableRow>
        <TableCell>
          <TransactionDatePicker
            date={tx.date}
            onSelect={(date) => updateTransaction({ date })}
          />
        </TableCell>
        <TableCell>
          <AccountCombobox
            value={tx.account_id}
            onChange={(value) => updateTransaction({ account_id: value })}
          />
        </TableCell>
        <TableCell>
          <Input
            placeholder="Notes"
            value={tx.notes}
            onChange={(e) => updateTransaction({ notes: e.target.value })}
          />
        </TableCell>
        <TableCell>
          <CategoryCombobox
            value={tx.category_id}
            onChange={(value) => updateTransaction({ category_id: value })}
          />
        </TableCell>
        <TableCell className="text-right">
          <InputNumber
            placeholder="0"
            value={tx.payment}
            onChange={(payment) => updateTransaction({ payment, deposit: 0 })}
          />
        </TableCell>
        <TableCell className="text-right">
          <InputNumber
            placeholder="0"
            value={tx.deposit}
            onChange={(deposit) => updateTransaction({ payment: 0, deposit })}
          />
        </TableCell>
      </TableRow>
      <tr className="py-3 border-b border-primary">
        <td colSpan={6} className="text-right py-3">
          <div className="flex gap-2 justify-end">
            <Button onClick={cancelTransaction} variant={"outline"}>
              Cancel
            </Button>
            <form action={addTransaction}>
              <Button type="submit">Add</Button>
            </form>
          </div>
        </td>
      </tr>
    </>
  );
};
