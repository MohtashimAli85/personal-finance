"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { createAccount } from "@/app/actions/accounts/mutations";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
		defaultValues: { name: "", initialBalance: "0", offBudget: false },
		errors: state?.errors,
	});
	const onSubmit = (values: AccountValues) => {
		mutate(values, {
			onSuccess: () => {
				setOpen(false);
				toast.success(`Added ${values.name}`);
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
					<Plus /> Add account
				</SidebarMenuButton>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add account</DialogTitle>
					<DialogDescription>
						Enter today's balance from your bank. Off-budget accounts, like
						investments or loans, count toward net worth but not your budget.
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
									<FieldLabel>Current balance</FieldLabel>
									<Input
										{...field}
										inputMode="decimal"
										data-money
										className="text-right tabular-nums"
										aria-invalid={fieldState.invalid}
									/>
									<FieldError>{fieldState.error?.message}</FieldError>
								</Field>
							)}
						/>
						<Controller
							name="offBudget"
							control={form.control}
							render={({ field }) => (
								<Field orientation="horizontal">
									<Checkbox
										id="off-budget"
										checked={field.value}
										onCheckedChange={field.onChange}
									/>
									<FieldLabel htmlFor="off-budget">Off budget</FieldLabel>
								</Field>
							)}
						/>
						<DialogFooter>
							<Button type="submit">Add account</Button>
						</DialogFooter>
					</FieldGroup>
				</form>
			</DialogContent>
		</Dialog>
	);
};

export default AddAccount;
