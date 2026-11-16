import {
	ArrowRight,
	KeyRound,
	Laptop,
	type LucideIcon,
	Scissors,
	Sparkles,
	Target,
	TrendingUp,
	UserRound,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemMedia,
	ItemTitle,
} from "@/components/ui/item";

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
	composer,
}: {
	hasKey: boolean;
	hasProfile: boolean;
	onSuggestion: (text: string) => void;
	composer: ReactNode;
}) {
	return (
		<Empty className="min-h-0 overflow-y-auto px-0 py-8">
			<EmptyHeader className="max-w-lg">
				<EmptyMedia
					variant="icon"
					className="size-12 rounded-full border bg-card"
				>
					<Sparkles className="size-5" />
				</EmptyMedia>
				<EmptyTitle className="text-2xl font-semibold tracking-tight">
					Your money coach
				</EmptyTitle>
				<EmptyDescription>
					Talk through your budget, spending, or how to save for something. It
					can see your accounts, budget and goals.
				</EmptyDescription>
			</EmptyHeader>
			{composer}
			<EmptyContent className="max-w-3xl px-2">
				{hasKey ? (
					<div className="grid w-full gap-2 sm:grid-cols-2">
						{SUGGESTIONS.map(({ text, detail, icon: Icon }) => (
							<Item
								key={text}
								asChild
								variant="outline"
								size="sm"
								className="cursor-pointer bg-card hover:bg-muted"
							>
								<button type="button" onClick={() => onSuggestion(text)}>
									<ItemMedia variant="icon">
										<Icon className="text-muted-foreground" />
									</ItemMedia>
									<ItemContent className="gap-0.5">
										<ItemTitle>{text}</ItemTitle>
										<ItemDescription className="text-xs">
											{detail}
										</ItemDescription>
									</ItemContent>
								</button>
							</Item>
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
					<Button
						asChild
						variant="link"
						size="sm"
						className="text-muted-foreground"
					>
						<Link href="/settings">
							<UserRound />
							Tell the coach about yourself for more personal advice
							<ArrowRight />
						</Link>
					</Button>
				)}
			</EmptyContent>
		</Empty>
	);
}
