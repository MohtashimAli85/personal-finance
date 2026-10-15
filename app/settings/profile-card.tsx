import { Loader2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PROFILE_LIMITS, type Profile } from "@/lib/profile-schema";
import FeedbackText from "./feedback-text";
import { useProfileForm } from "./use-profile-form";

export default function ProfileCard({ profile }: { profile: Profile }) {
	const { values, dirty, feedback, isPending, update, submit } =
		useProfileForm(profile);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<UserRound className="h-4 w-4" />
					About you
				</CardTitle>
				<p className="text-sm text-muted-foreground">
					Tell the AI coach about yourself so its advice fits your life. This
					stays in your local database and is sent to the AI provider with each
					chat.
				</p>
			</CardHeader>
			<CardContent>
				<form className="space-y-4" onSubmit={submit}>
					<Field>
						<FieldLabel>What should the coach call you?</FieldLabel>
						<Input
							value={values.name}
							onChange={update("name")}
							maxLength={PROFILE_LIMITS.name}
							placeholder="Your name or nickname"
						/>
					</Field>
					<Field>
						<FieldLabel>About you</FieldLabel>
						<Textarea
							value={values.about}
							onChange={update("about")}
							maxLength={PROFILE_LIMITS.about}
							rows={6}
							placeholder="Your work and payday, who you support, your goals, and the habits you want help with"
						/>
						<FieldDescription>
							Work and payday, who you support, big plans, habits you want help
							with. {values.about.length}/{PROFILE_LIMITS.about}
						</FieldDescription>
					</Field>
					<Field>
						<FieldLabel>How should the coach talk to you?</FieldLabel>
						<Textarea
							value={values.style}
							onChange={update("style")}
							maxLength={PROFILE_LIMITS.style}
							rows={2}
							placeholder="e.g. Be blunt, keep it short, use Roman Urdu sometimes."
						/>
					</Field>
					<div className="flex items-center gap-3">
						<Button type="submit" disabled={isPending || !dirty}>
							{isPending && <Loader2 className="h-4 w-4 animate-spin" />}
							Save
						</Button>
						<FeedbackText feedback={feedback} />
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
