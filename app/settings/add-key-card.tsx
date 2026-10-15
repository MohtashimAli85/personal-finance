import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { AiProvider } from "@/lib/settings";
import FeedbackText from "./feedback-text";
import { PROVIDERS } from "./providers";
import { useAddKey } from "./use-add-key";

export default function AddKeyCard({ canStore }: { canStore: boolean }) {
	const { apiKey, setApiKey, provider, setChosen, feedback, isPending, save } =
		useAddKey();
	const disabled = !canStore || isPending;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Add an API key</CardTitle>
				<p className="text-sm text-muted-foreground">
					Paste a key and we&apos;ll detect its provider from the prefix. Pick
					one yourself if it isn&apos;t recognised.
				</p>
			</CardHeader>
			<CardContent className="space-y-3">
				<form
					className="flex flex-col gap-2 sm:flex-row"
					onSubmit={(event) => {
						event.preventDefault();
						save();
					}}
				>
					<Input
						type="password"
						autoComplete="off"
						placeholder="Paste an API key"
						value={apiKey}
						onChange={(event) => setApiKey(event.target.value)}
						disabled={disabled}
					/>
					<Select
						value={provider ?? ""}
						onValueChange={(value) => setChosen(value as AiProvider)}
						disabled={disabled}
					>
						<SelectTrigger className="sm:w-48">
							<SelectValue placeholder="Provider" />
						</SelectTrigger>
						<SelectContent>
							{PROVIDERS.map((option) => (
								<SelectItem key={option.id} value={option.id}>
									{option.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button type="submit" disabled={disabled || !apiKey || !provider}>
						Save
					</Button>
				</form>
				<FeedbackText feedback={feedback} />
			</CardContent>
		</Card>
	);
}
