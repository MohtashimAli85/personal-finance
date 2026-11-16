export default function PageHeader({
	title,
	description,
	figures,
	children,
}: {
	title: React.ReactNode;
	description?: React.ReactNode;
	figures?: React.ReactNode;
	children?: React.ReactNode;
}) {
	return (
		<header className="flex flex-col gap-1">
			<div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
				<h1 className="min-w-0 truncate text-xl font-semibold tracking-tight">
					{title}
				</h1>
				{children && (
					<div className="flex flex-wrap items-center gap-2">{children}</div>
				)}
			</div>
			{(description || figures) && (
				<div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
					{description && (
						<p className="text-muted-foreground">{description}</p>
					)}
					{figures && (
						<dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
							{figures}
						</dl>
					)}
				</div>
			)}
		</header>
	);
}
