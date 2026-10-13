import { TableCell } from "@/components/ui/table";
import { cn } from "@/lib/tailwindcss/utils";

export default function ListCell({
	className,
	...props
}: React.ComponentProps<typeof TableCell>) {
	return <TableCell className={cn("px-2 py-3", className)} {...props} />;
}
