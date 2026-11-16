import Link from "next/link";
import PageMessage from "@/components/page-message";
import { Button } from "@/components/ui/button";

export default function AccountNotFoundPage() {
	return (
		<PageMessage
			title="Account not found"
			description="This account doesn't exist, or it was closed or deleted."
		>
			<Button asChild variant="outline">
				<Link href="/">Go to dashboard</Link>
			</Button>
			<Button asChild>
				<Link href="/transactions">View all transactions</Link>
			</Button>
		</PageMessage>
	);
}
