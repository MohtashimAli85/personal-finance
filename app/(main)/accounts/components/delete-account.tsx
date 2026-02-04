import { Account, deleteAccount } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2Icon } from "lucide-react";
import Form from "next/form";

const DeleteAccount = ({ name, id }: Omit<Account, "balance">) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={"ghost"} size={"icon-sm"}>
          <Trash2Icon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Account</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this &quot;{name}&quot; account?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <Form action={deleteAccount}>
          <input type="hidden" name="id" value={id} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="submit">Delete Account</Button>
            </DialogClose>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteAccount;
