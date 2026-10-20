"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
	retry,
}: {
	error: unknown;
	retry: () => void;
}) {
	return (
		<div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
			<h1 className="text-xl font-semibold">Something went wrong</h1>
			<p className="max-w-md text-muted-foreground">
				The page hit an unexpected error. Your data is safe; try again.
			</p>
			<Button onClick={() => retry()}>Try again</Button>
		</div>
	);
}
