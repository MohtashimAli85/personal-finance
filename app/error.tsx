"use client";

import PageMessage from "@/components/page-message";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
	retry,
}: {
	error: unknown;
	retry: () => void;
}) {
	return (
		<PageMessage
			title="Something went wrong"
			description="The page hit an unexpected error. Your data is safe; try again."
		>
			<Button onClick={() => retry()}>Try again</Button>
		</PageMessage>
	);
}
