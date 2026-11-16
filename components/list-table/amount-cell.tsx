import SignedAmount from "@/components/signed-amount";
import ListCell from "./list-cell";

export default function AmountCell({
	payment,
	deposit,
}: {
	payment: number | null;
	deposit: number | null;
}) {
	return (
		<ListCell className="text-right">
			<SignedAmount payment={payment} deposit={deposit} />
		</ListCell>
	);
}
