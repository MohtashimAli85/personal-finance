import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AccountNotFoundPage() {
	return (
		<div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
			<h1 className="text-xl font-semibold">Account not found</h1>
			<p className="text-muted-foreground">
				The account you requested does not exist or was deleted.
			</p>
			<div className="flex gap-2">
				<Button asChild variant="outline">
					<Link href="/">Go to dashboard</Link>
				</Button>
				<Button asChild>
					<Link href="/transactions">View all transactions</Link>
				</Button>
			</div>
		</div>
	);
}
