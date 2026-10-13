import { cn } from "@/lib/tailwindcss/utils";

export default function PageContainer({
	className,
	children,
}: {
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="-mx-4 -mb-4 min-h-0 flex-1 overflow-y-auto px-4 pb-4">
			<div className={cn("mx-auto flex w-full flex-col gap-6", className)}>
				{children}
			</div>
		</div>
	);
}
