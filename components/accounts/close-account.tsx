import {
	archiveAccount,
	forceCloseAccount,
} from "@/app/actions/accounts/mutations";
import { formatCurrency } from "@/lib/helper";
import { Button } from "../ui/button";
import {
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import AccountCombobox from "./account-combobox";

const CloseAccount = ({ account }: { account: Account }) => {
	const hasBalance = account.balance !== 0;

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Close {account.name}</DialogTitle>
				<DialogDescription>
					Closing archives this account - its transactions and budget history
					stay intact, and it can be reopened later. It disappears from account
					pickers and totals.
					{hasBalance && (
						<>
							<br />
							<br />
							This account has a balance of{" "}
							<strong>{formatCurrency(account.balance)}</strong>. Optionally
							transfer it to another account before closing:
						</>
					)}
				</DialogDescription>
			</DialogHeader>
			<form action={archiveAccount} className="space-y-4">
				<input type="hidden" name="id" value={account.id} />
				{hasBalance && <AccountCombobox modal />}
				<DialogFooter>
					<DialogClose asChild>
						<Button type="submit">Close Account</Button>
					</DialogClose>
				</DialogFooter>
			</form>
			<p className="text-xs text-muted-foreground">
				You can also{" "}
				<Button
					variant={"link"}
					form="force-close-form"
					className="p-0 h-auto underline text-xs"
				>
					permanently delete
				</Button>{" "}
				this account, which destroys it and all its transactions immediately.
				This cannot be undone.
			</p>
			<form
				className="inline"
				action={forceCloseAccount.bind(null, account.id)}
				id="force-close-form"
			/>
		</DialogContent>
	);
};

export default CloseAccount;
