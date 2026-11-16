export default function PageSection({
	title,
	description,
	children,
}: {
	title: string;
	description?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<h2 className="text-base font-semibold">{title}</h2>
				{description && (
					<div className="text-sm text-muted-foreground">{description}</div>
				)}
			</div>
			{children}
		</section>
	);
}
