import { Trash2Icon } from "lucide-react";
import Form from "next/form";
import { deleteTransaction } from "@/app/actions/transaction/mutations";
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

type Props = {
	id: string;
	description?: string | null;
};

const DeleteTransaction = ({ id, description }: Props) => {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant={"ghost"} size={"icon-sm"}>
					<Trash2Icon />
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Transaction</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete this transaction &quot;
						{description ?? ""}&quot;? This action cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<Form action={deleteTransaction}>
					<input type="hidden" name="id" value={id} />
					<DialogFooter>
						<Button type="submit">Delete Transaction</Button>
					</DialogFooter>
				</Form>
			</DialogContent>
		</Dialog>
	);
};

export default DeleteTransaction;
