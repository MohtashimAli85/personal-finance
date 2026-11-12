"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useHouseSpendCategories } from "./use-house-spend-categories";

export default function HouseSpendDialog({ excluded }: { excluded: string[] }) {
	const { groups, isCounted, toggle } = useHouseSpendCategories(excluded);

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="link" className="h-auto p-0 text-xs">
					Edit
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>House spend</DialogTitle>
					<DialogDescription>
						Untick categories that aren't house running costs, like family
						pocket money.
					</DialogDescription>
				</DialogHeader>
				<div className="-mx-1 max-h-[60vh] space-y-4 overflow-y-auto px-1">
					{groups.map((group) => (
						<div key={group.id} className="space-y-2">
							<p className="text-xs font-medium text-muted-foreground">
								{group.name}
							</p>
							{group.categories.map((category) => (
								<Label
									key={category.id}
									className="flex items-center gap-2 font-normal"
								>
									<Checkbox
										checked={isCounted(category.id)}
										onCheckedChange={(v) => toggle(category.id, v === true)}
									/>
									{category.name}
								</Label>
							))}
						</div>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}
