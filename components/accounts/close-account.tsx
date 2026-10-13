import {
	archiveAccount,
	forceCloseAccount,
} from "@/app/actions/accounts/mutations";
import ConfirmDialog from "../confirm-dialog";
import { Money } from "../money";
import { Button } from "../ui/button";
import {
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import AccountCombobox from "./account-combobox";
import CloseAccountSubmit from "./close-account-submit";

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
							<strong>
								<Money value={account.balance} />
							</strong>
							. Optionally transfer it to another account before closing:
						</>
					)}
				</DialogDescription>
			</DialogHeader>
			<form action={archiveAccount} className="space-y-4">
				<input type="hidden" name="id" value={account.id} />
				{hasBalance && <AccountCombobox modal />}
				<DialogFooter>
					<CloseAccountSubmit />
				</DialogFooter>
			</form>
			<p className="text-xs text-muted-foreground">
				You can also{" "}
				<ConfirmDialog
					title={`Permanently delete ${account.name}?`}
					description="This destroys the account and all of its transactions. This cannot be undone."
					confirmLabel="Delete forever"
					onConfirm={() => forceCloseAccount(account.id)}
					trigger={
						<Button variant="link" className="h-auto p-0 text-xs underline">
							permanently delete
						</Button>
					}
				/>{" "}
				this account instead.
			</p>
		</DialogContent>
	);
};

export default CloseAccount;
