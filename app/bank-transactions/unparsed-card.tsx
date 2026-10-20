import { AlertCircle } from "lucide-react";
import type { UnparsedEmail } from "@/app/actions/bank/sender-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatDate(value: string | null) {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleDateString("en-CA");
}

export default function UnparsedCard({ emails }: { emails: UnparsedEmail[] }) {
	if (emails.length === 0) return null;

	return (
		<Card className="border-amber-500/40">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base text-amber-600">
					<AlertCircle className="h-4 w-4" />
					{emails.length} bank email{emails.length === 1 ? "" : "s"}{" "}
					couldn&apos;t be read
				</CardTitle>
				<p className="text-sm text-muted-foreground">
					These look like transaction alerts but no parser matched their format,
					so they were not imported. Ordinary mail such as login alerts is not
					listed here.
				</p>
			</CardHeader>
			<CardContent>
				<ul className="space-y-1 text-sm">
					{emails.map((email) => (
						<li key={email.id} className="flex gap-2 text-muted-foreground">
							<span className="whitespace-nowrap">
								{formatDate(email.date)}
							</span>
							<span className="truncate">
								{email.subject ?? "(no subject)"}
							</span>
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
}
