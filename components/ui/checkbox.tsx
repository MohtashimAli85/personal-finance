"use client";

import { Check } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/tailwindcss/utils";

function Checkbox({
	className,
	...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
	return (
		<CheckboxPrimitive.Root
			className={cn(
				"peer h-4 w-4 shrink-0 rounded-sm border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-checked:bg-primary data-checked:text-primary-foreground",
				className,
			)}
			{...props}
		>
			<CheckboxPrimitive.Indicator
				className={cn("flex items-center justify-center text-current")}
			>
				<Check className="h-3 w-3" />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox };
