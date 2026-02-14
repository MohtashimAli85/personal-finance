import {
	closeAccount,
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
	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Delete Account</DialogTitle>
				<DialogDescription>
					Are you sure you want to delete this <strong>{account.name}</strong>{" "}
					account?
					<br />
					<br />
					This account has a balance of{" "}
					<strong>{formatCurrency(account.balance)}</strong>. Please transfer
					the balance to another account before deleting.
					<br />
					<br />
				</DialogDescription>
			</DialogHeader>
			<AccountCombobox modal />
			<form
				className="inline"
				action={forceCloseAccount.bind(null, account.id)}
				id="force-close-form"
			/>
			<p>
				You can also{" "}
				<Button
					variant={"link"}
					form="force-close-form"
					className="p-0 h-auto underline"
				>
					force close
				</Button>{" "}
				the account which will delete it and all its transactions permanently.
				Doing so may change
			</p>
			<form action={closeAccount} className="space-y-4">
				<input type="hidden" name="id" value={account.id} />
				<DialogFooter>
					<DialogClose asChild>
						<Button type="submit">Delete Account</Button>
					</DialogClose>
				</DialogFooter>
			</form>
		</DialogContent>
	);
};

export default CloseAccount;
