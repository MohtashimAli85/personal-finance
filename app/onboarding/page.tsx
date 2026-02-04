import { redirect } from "next/navigation";
import { accountExists, createAccount } from "@/app/actions/account";
import Form from "next/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
const Onboarding = async () => {
  const hasAccount = await accountExists();
  if (hasAccount) redirect("/");
  return (
    <Form action={createAccount}>
      <div className="h-screen grid p-4 sm:place-content-center">
        <Card className="w-full sm:w-96">
          <CardHeader>
            <CardTitle>Set up your account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Your Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initialBalance">Initial Balance</Label>
                <Input
                  id="initialBalance"
                  name="initialBalance"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                />
              </div>
              <Button type="submit" className="w-full">
                Create Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Form>
  );
};

export default Onboarding;
