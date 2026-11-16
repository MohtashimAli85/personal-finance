export default function ChartEmpty({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<p className="flex h-56 items-center justify-center text-muted-foreground">
			{children}
		</p>
	);
}
