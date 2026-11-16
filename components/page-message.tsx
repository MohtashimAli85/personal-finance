export default function PageMessage({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
			<h1 className="text-xl font-semibold tracking-tight">{title}</h1>
			<p className="max-w-md text-muted-foreground">{description}</p>
			<div className="flex gap-2">{children}</div>
		</div>
	);
}
