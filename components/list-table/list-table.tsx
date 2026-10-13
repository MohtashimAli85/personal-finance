import { Table } from "@/components/ui/table";
import { cn } from "@/lib/tailwindcss/utils";

export default function ListTable({
	className,
	...props
}: React.ComponentProps<typeof Table>) {
	return (
		<Table
			className={cn(
				"[&_td:first-child]:pl-4 [&_th:first-child]:pl-4 [&_th]:h-9 [&_th]:bg-muted/40 [&_th]:text-xs [&_th]:font-normal [&_th]:text-muted-foreground [&_th]:before:hidden [&_th]:after:hidden",
				className,
			)}
			{...props}
		/>
	);
}
