import { Account, updateAccount } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit3Icon } from "lucide-react";
import Form from "next/form";

const EditAccount = ({ name, id }: Omit<Account, "balance">) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={"ghost"} size={"icon-sm"}>
          <Edit3Icon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>
            Make changes to your account here.
          </DialogDescription>
        </DialogHeader>
        <Form action={updateAccount}>
          <div className="space-y-4">
            <input type="hidden" name="id" value={id} />
            <div className="space-y-3">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={name}
                placeholder="Enter account name"
              />
            </div>
            <Button type="submit">
              <DialogClose>Save Changes</DialogClose>
            </Button>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAccount;
