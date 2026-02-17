"use client";

import TransactionDelete from "./transaction-delete";
import TransactionSearch from "./transaction-search";

export default function TransactionToolbar() {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      {/* Search Input */}
      <TransactionSearch />

      {/* Bulk Actions */}
      <TransactionDelete />
    </div>
  );
}
