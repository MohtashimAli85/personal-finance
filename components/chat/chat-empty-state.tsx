import {
	KeyRound,
	Laptop,
	type LucideIcon,
	Scissors,
	Sparkles,
	Target,
	TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const SUGGESTIONS: { text: string; detail: string; icon: LucideIcon }[] = [
	{
		text: "How am I doing this month?",
		detail: "Budget, spending and savings so far",
		icon: TrendingUp,
	},
	{
		text: "Help me save for a new laptop",
		detail: "Build a monthly savings plan",
		icon: Laptop,
	},
	{
		text: "Where can I cut back on spending?",
		detail: "Spot categories that grew",
		icon: Scissors,
	},
	{
		text: "Am I on track for my goals?",
		detail: "Check progress against targets",
		icon: Target,
	},
];

export default function ChatEmptyState({
	hasKey,
	hasProfile,
	onSuggestion,
}: {
	hasKey: boolean;
	hasProfile: boolean;
	onSuggestion: (text: string) => void;
}) {
	return (
		<div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-2 py-8 text-center">
			<div className="flex flex-col items-center gap-3">
				<div className="flex size-12 items-center justify-center rounded-full border bg-card">
					<Sparkles className="size-5 text-muted-foreground" />
				</div>
				<div>
					<h1 className="text-xl font-semibold">Your money coach</h1>
					<p className="text-sm text-muted-foreground">
						Talk through your budget, spending, or how to save for something. It
						can see your accounts, budget and goals.
					</p>
				</div>
			</div>
			{hasKey ? (
				<div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
					{SUGGESTIONS.map(({ text, detail, icon: Icon }) => (
						<Button
							key={text}
							variant="outline"
							className="h-auto justify-start gap-3 whitespace-normal py-3 text-left"
							onClick={() => onSuggestion(text)}
						>
							<Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
							<span className="flex flex-col gap-0.5">
								<span className="font-medium">{text}</span>
								<span className="text-xs font-normal text-muted-foreground">
									{detail}
								</span>
							</span>
						</Button>
					))}
				</div>
			) : (
				<Button asChild>
					<Link href="/settings">
						<KeyRound /> Add an AI provider key in Settings
					</Link>
				</Button>
			)}
			{hasKey && !hasProfile && (
				<Link
					href="/settings"
					className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
				>
					Tell the coach about yourself for more personal advice
				</Link>
			)}
		</div>
	);
}
