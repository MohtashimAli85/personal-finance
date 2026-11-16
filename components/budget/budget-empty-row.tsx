import { Wallet } from "lucide-react";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { TableCell, TableRow } from "@/components/ui/table";

export default function BudgetEmptyRow() {
	return (
		<TableRow className="hover:bg-transparent">
			<TableCell colSpan={4} className="whitespace-normal">
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Wallet />
						</EmptyMedia>
						<EmptyTitle>Start your budget</EmptyTitle>
						<EmptyDescription>
							Add a group such as Bills or Everyday, then add categories to it
							and give each one an amount for the month.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			</TableCell>
		</TableRow>
	);
}
