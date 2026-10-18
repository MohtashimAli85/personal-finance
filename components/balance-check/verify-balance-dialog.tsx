"use client";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/tailwindcss/utils";
import ActualAmounts from "./actual-amounts";
import DifferenceSplits from "./difference-splits";
import SummaryLine from "./summary-line";
import { useBalanceCheck } from "./use-balance-check";

export default function VerifyBalanceDialog({
	appTotal,
	pendingTotal,
}: {
	appTotal: number;
	pendingTotal: number;
}) {
	const check = useBalanceCheck(appTotal, pendingTotal);

	return (
		<Dialog open={check.open} onOpenChange={check.changeOpen}>
			<DialogTrigger asChild>
				<Button variant="link" className="h-auto p-0 text-xs">
					Verify
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Verify balance</DialogTitle>
					<DialogDescription>
						Enter what you actually have, then distribute any difference into
						categories.
					</DialogDescription>
				</DialogHeader>

				<div className="-mx-1 max-h-[65vh] space-y-4 overflow-y-auto px-1">
					<SummaryLine
						label="App total"
						value={appTotal}
						className="font-medium"
					/>

					<Separator />
					<ActualAmounts rows={check.actual} />

					{check.hasActual && (
						<>
							<Separator />
							<div className="space-y-1">
								<SummaryLine
									label="Difference"
									value={check.difference}
									className={cn(
										"font-semibold",
										check.difference < 0 && "text-destructive",
										check.difference > 0 && "text-emerald-500",
									)}
								/>
								{pendingTotal !== 0 && check.difference !== 0 && (
									<SummaryLine
										label="After accepting pending"
										value={check.differenceWithPending}
										className="text-xs text-muted-foreground"
									/>
								)}
							</div>
						</>
					)}

					{check.hasActual && check.difference !== 0 && (
						<DifferenceSplits
							rows={check.splits}
							accountId={check.accountId}
							onAccountChange={check.setAccountId}
							isDeposit={check.difference > 0}
							remaining={check.remaining}
						/>
					)}

					{check.error && (
						<p className="text-sm text-destructive">{check.error}</p>
					)}
				</div>

				<DialogFooter>
					<Button
						disabled={!check.canSave || check.isSaving}
						onClick={check.save}
					>
						{check.difference === 0 ? "Mark verified" : "Save adjustments"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
