"use client";

import ExportTransactions from "./export-transactions";
import ImportTransactions from "./import-transactions";
import TransactionDelete from "./transaction-delete";
import TransactionSearch from "./transaction-search";

export default function TransactionToolbar({
  accountId,
}: {
  accountId?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      {/* Search Input */}
      <TransactionSearch />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <ImportTransactions accountId={accountId} />
        <ExportTransactions accountId={accountId} />
        <TransactionDelete />
      </div>
    </div>
  );
}
