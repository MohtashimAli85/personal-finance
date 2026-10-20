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
import { useCloseAccount } from "./use-close-account";

const CloseAccount = ({ account }: { account: Account }) => {
	const hasBalance = account.balance !== 0;
	const close = useCloseAccount(account.id);

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
			<form onSubmit={close.archive} className="space-y-4">
				{hasBalance && (
					<AccountCombobox
						modal
						value={close.transferAccountId}
						onChange={close.setTransferAccountId}
					/>
				)}
				<DialogFooter>
					<Button type="submit" disabled={close.isPending}>
						{close.isPending ? "Closing..." : "Close Account"}
					</Button>
				</DialogFooter>
			</form>
			<p className="text-xs text-muted-foreground">
				You can also{" "}
				<ConfirmDialog
					title={`Permanently delete ${account.name}?`}
					description="This destroys the account and all of its transactions. This cannot be undone."
					confirmLabel="Delete forever"
					onConfirm={close.remove}
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
