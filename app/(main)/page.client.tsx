"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import { fetchMeezanTransactions } from "../actions/get-transactions";
import { Badge } from "@/components/ui/badge";

export default function FinanceDashboardClient() {
  const [isPending, startTransition] = useTransition();
  const [transactions, setTransactions] = useState<any[]>([]);

  // Calculate Total Spent
  const totalSpent = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const handleSync = () => {
    startTransition(async () => {
      const result = await fetchMeezanTransactions();
      console.log({ result });
      if (result.success && result.data) {
        setTransactions(result.data);
      } else {
        alert("Failed to sync. Check your email settings.");
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Finance Tracker</h1>
        <Button onClick={handleSync} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync Meezan Bank
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Spent (Recent)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              PKR {totalSpent.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Send To</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-10 text-muted-foreground"
                  >
                    No data found. Click &quot;Sync&quot; to fetch transactions.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((t, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{t.date}</TableCell>
                    <TableCell>{t.description}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          t.type === "expense" ? "destructive" : "default"
                        }
                      >
                        {t.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{t.sendTo || "-"}</TableCell>
                    <TableCell className="text-right font-bold">
                      PKR {parseFloat(t.amount).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
