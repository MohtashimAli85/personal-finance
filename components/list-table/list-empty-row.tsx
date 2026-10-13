import { TableCell, TableRow } from "@/components/ui/table";

export default function ListEmptyRow({
	colSpan,
	children,
}: {
	colSpan: number;
	children: React.ReactNode;
}) {
	return (
		<TableRow>
			<TableCell
				colSpan={colSpan}
				className="py-10 text-center text-muted-foreground"
			>
				{children}
			</TableCell>
		</TableRow>
	);
}
