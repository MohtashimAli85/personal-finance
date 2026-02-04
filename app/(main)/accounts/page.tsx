import { getAccounts } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import EditAccount from "./components/edit-account";
import DeleteAccount from "./components/delete-account";

function formatCurrency(value: number, currency = "PKR") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);
  } catch (e) {
    return `${value}`;
  }
}

export default async function Page() {
  const accounts = await getAccounts();

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>Your account balances</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 && (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={5}>
                    No accounts found.
                  </TableCell>
                </TableRow>
              )}

              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <div className="font-medium">{account.name}</div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(account.balance ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <EditAccount name={account.name} id={account.id} />
                      <DeleteAccount name={account.name} id={account.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
