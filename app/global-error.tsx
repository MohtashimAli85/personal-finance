"use client";

import "./globals.css";
import { Button } from "@/components/ui/button";

function prefersDark() {
	const theme = localStorage.getItem("theme");
	if (theme === "system") {
		return matchMedia("(prefers-color-scheme: dark)").matches;
	}
	return theme !== "light";
}

export default function GlobalError({
	retry,
}: {
	error: unknown;
	retry: () => void;
}) {
	return (
		<html
			lang="en"
			className={typeof window === "undefined" || prefersDark() ? "dark" : ""}
			suppressHydrationWarning
		>
			<body className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-center text-foreground antialiased">
				<title>Something went wrong · Personal Finance</title>
				<h1 className="text-xl font-semibold">Something went wrong</h1>
				<p className="text-muted-foreground">
					The app hit an unexpected error. Your data is safe; try again.
				</p>
				<Button onClick={() => retry()}>Try again</Button>
			</body>
		</html>
	);
}
