import type { Metadata } from "next";
import Link from "next/link";
import PageMessage from "@/components/page-message";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFoundPage() {
	return (
		<PageMessage
			title="Page not found"
			description="That link doesn't lead anywhere. It may point to something that was deleted."
		>
			<Button asChild>
				<Link href="/">Go to dashboard</Link>
			</Button>
		</PageMessage>
	);
}
