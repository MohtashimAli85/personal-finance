"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { createGoal, updateGoal } from "@/app/actions/goals/mutations";
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
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { GoalView } from "@/lib/goal";
import { type GoalInput, type GoalValues, goalSchema } from "@/lib/goal-schema";
import { fromCents } from "@/lib/money";

const NEW_CATEGORY = "__new__";

export interface LinkableCategory {
	id: string;
	name: string;
	groupName: string;
}

export default function GoalDialog({
	goal,
	linkableCategories = [],
	trigger,
}: {
	goal?: GoalView;
	linkableCategories?: LinkableCategory[];
	trigger: React.ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const isEdit = Boolean(goal);

	const defaultValues: GoalInput = {
		name: goal?.name ?? "",
		targetAmount: goal ? String(fromCents(goal.targetAmount)) : "",
		targetMonth: goal?.targetMonth ?? "",
		categoryId: NEW_CATEGORY,
		notes: goal?.notes ?? "",
	};

	const form = useForm<GoalInput, unknown, GoalValues>({
		resolver: zodResolver(goalSchema),
		defaultValues,
	});

	const onSubmit = (values: GoalValues) => {
		setFormError(null);
		const payload: GoalInput = {
			...values,
			categoryId:
				values.categoryId === NEW_CATEGORY ? undefined : values.categoryId,
		};
		startTransition(async () => {
			const result = goal
				? await updateGoal({ ...payload, id: goal.id })
				: await createGoal(payload);
			if (result.success) {
				setOpen(false);
				return;
			}
			for (const [key, error] of Object.entries(result.errors ?? {})) {
				if (error) form.setError(key as keyof GoalInput, error);
			}
			setFormError(result.message ?? null);
		});
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(value) => {
				setOpen(value);
				if (value) {
					setFormError(null);
					form.reset(defaultValues);
				}
			}}
		>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit goal" : "New savings goal"}</DialogTitle>
					<DialogDescription>
						{isEdit
							? "Update the target or deadline."
							: "A goal gets its own budget category. Budget money into it each month to save toward the target."}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<FieldGroup>
						<Controller
							name="name"
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>Name</FieldLabel>
									<Input
										{...field}
										placeholder="New laptop"
										aria-invalid={fieldState.invalid}
									/>
									<FieldError>{fieldState.error?.message}</FieldError>
								</Field>
							)}
						/>
						<div className="grid grid-cols-2 gap-4">
							<Controller
								name="targetAmount"
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>Target amount</FieldLabel>
										<Input
											{...field}
											data-money
											value={String(field.value ?? "")}
											inputMode="decimal"
											placeholder="250000"
											aria-invalid={fieldState.invalid}
										/>
										<FieldError>{fieldState.error?.message}</FieldError>
									</Field>
								)}
							/>
							<Controller
								name="targetMonth"
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>Target month</FieldLabel>
										<Input
											{...field}
											value={field.value ?? ""}
											type="month"
											aria-invalid={fieldState.invalid}
										/>
										<FieldError>{fieldState.error?.message}</FieldError>
									</Field>
								)}
							/>
						</div>
						{!isEdit && linkableCategories.length > 0 && (
							<Controller
								name="categoryId"
								control={form.control}
								render={({ field }) => (
									<Field>
										<FieldLabel>Budget category</FieldLabel>
										<Select value={field.value} onValueChange={field.onChange}>
											<SelectTrigger className="w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value={NEW_CATEGORY}>
													Create a new category
												</SelectItem>
												{linkableCategories.map((category) => (
													<SelectItem key={category.id} value={category.id}>
														{category.groupName} / {category.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FieldDescription>
											Link an existing category if you already save into one.
										</FieldDescription>
									</Field>
								)}
							/>
						)}
						<Controller
							name="notes"
							control={form.control}
							render={({ field }) => (
								<Field>
									<FieldLabel>Notes</FieldLabel>
									<Textarea {...field} value={field.value ?? ""} rows={2} />
								</Field>
							)}
						/>
						{formError && (
							<p className="text-sm text-destructive">{formError}</p>
						)}
						<DialogFooter>
							<Button type="submit" disabled={isPending}>
								{isEdit ? "Save changes" : "Create goal"}
							</Button>
						</DialogFooter>
					</FieldGroup>
				</form>
			</DialogContent>
		</Dialog>
	);
}
