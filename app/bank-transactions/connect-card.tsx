import { Loader2, Mail } from "lucide-react";
import FeedbackText from "@/components/feedback-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useConnectMail } from "./use-connect-mail";

const APP_PASSWORDS_URL = "https://myaccount.google.com/apppasswords";

export default function ConnectCard() {
	const {
		email,
		setEmail,
		appPassword,
		setAppPassword,
		feedback,
		isPending,
		submit,
	} = useConnectMail();

	return (
		<Card className="max-w-xl w-full mx-auto">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-lg">
					<Mail className="h-5 w-5" />
					Connect your Gmail
				</CardTitle>
				<p className="text-sm text-muted-foreground">
					The app reads bank alert emails from your inbox to import transactions
					automatically. It signs in with a Gmail app password, stored encrypted
					in the app&apos;s database.
				</p>
			</CardHeader>
			<CardContent className="space-y-5">
				<ol className="space-y-2 text-sm list-decimal list-inside text-muted-foreground">
					<li>Turn on 2-Step Verification for your Google account.</li>
					<li>
						Create an app password at{" "}
						<a
							href={APP_PASSWORDS_URL}
							target="_blank"
							rel="noreferrer"
							className="underline underline-offset-2 hover:text-foreground"
						>
							myaccount.google.com/apppasswords
						</a>
						.
					</li>
					<li>Enter your Gmail address and the 16-letter password below.</li>
				</ol>

				<form className="space-y-4" onSubmit={submit}>
					<Field>
						<FieldLabel>Gmail address</FieldLabel>
						<Input
							type="email"
							autoComplete="email"
							placeholder="you@gmail.com"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							disabled={isPending}
						/>
					</Field>
					<Field>
						<FieldLabel>App password</FieldLabel>
						<Input
							type="password"
							autoComplete="off"
							placeholder="abcd efgh ijkl mnop"
							value={appPassword}
							onChange={(event) => setAppPassword(event.target.value)}
							disabled={isPending}
						/>
						<FieldDescription>
							Not your Google password. You can revoke it any time from your
							Google account.
						</FieldDescription>
					</Field>
					<div className="flex items-center gap-3">
						<Button
							type="submit"
							disabled={isPending || !email || !appPassword}
						>
							{isPending && <Loader2 className="h-4 w-4 animate-spin" />}
							Connect
						</Button>
						<FeedbackText feedback={feedback} />
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
