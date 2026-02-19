"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { createAccount } from "@/app/actions/accounts/mutations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMutation } from "@/hooks/use-mutation";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { SidebarMenuButton } from "../ui/sidebar";
import { type AccountValues, accountSchema, type SchemaInput } from "./schema";

const initialState = {
  message: "",
  success: false,
};
const AddAccount = () => {
  const [open, setOpen] = useState(false);
  const [state, mutate] = useMutation<AccountValues>(
    createAccount,
    initialState,
  );
  const form = useForm<SchemaInput, unknown, AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { name: "", initialBalance: "0" },
    errors: state?.errors,
  });
  const onSubmit = (values: AccountValues) => {
    if (state.shouldValidate) {
      const isNameUnchanged = values.name === state.payload?.name;
      if (isNameUnchanged) {
        form.setError("name", {
          message: state.errors?.name?.message,
        });
        return;
      }
    }
    mutate(values, {
      onSuccess: () => {
        setOpen(false);
      },
    });
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        setTimeout(() => {
          form.reset();
        }, 300);
      }}
    >
      <DialogTrigger asChild>
        <SidebarMenuButton>
          <Plus /> Add Account
        </SidebarMenuButton>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a new account</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="group">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Name</FieldLabel>
                  <Input {...field} aria-invalid={fieldState.invalid} />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </Field>
              )}
            />
            <Controller
              name="initialBalance"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Balance</FieldLabel>
                  <Input {...field} aria-invalid={fieldState.invalid} />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </Field>
              )}
            />
            <DialogFooter>
              <Button type="submit">Create Account</Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAccount;
