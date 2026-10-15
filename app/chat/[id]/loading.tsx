import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/tailwindcss/utils";

const BUBBLES = [
	{ align: "start", width: "w-3/4" },
	{ align: "end", width: "w-1/2" },
	{ align: "start", width: "w-2/3" },
	{ align: "end", width: "w-2/5" },
];

export default function Loading() {
	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-2 py-4">
				{BUBBLES.map((bubble) => (
					<Skeleton
						key={bubble.width}
						className={cn(
							"h-10 rounded-2xl",
							bubble.width,
							bubble.align === "end" && "ml-auto",
						)}
					/>
				))}
			</div>
			<div className="mx-auto w-full max-w-3xl px-2 pt-2 pb-2">
				<Skeleton className="h-24 w-full rounded-2xl" />
			</div>
		</div>
	);
}
