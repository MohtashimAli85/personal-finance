"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { exportAllTransactions } from "@/app/actions/transaction/mutations";
import { Button } from "@/components/ui/button";

export default function ExportTransactions({
  accountId,
}: {
  accountId?: string;
}) {
  const [isPending, setIsPending] = useState(false);

  const handleExport = async () => {
    setIsPending(true);
    try {
      const csv = await exportAllTransactions(accountId);
      if (!csv) return;

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isPending}
    >
      <Download className="size-3.5" />
      {isPending ? "Exporting..." : "Export"}
    </Button>
  );
}
