"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCanGoBack } from "@/hooks/use-can-go-back";

export default function BackButton() {
	const router = useRouter();
	const canGoBack = useCanGoBack();

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={() => router.back()}
					disabled={!canGoBack}
					aria-label="Go back"
				>
					<ArrowLeft />
				</Button>
			</TooltipTrigger>
			<TooltipContent>Back</TooltipContent>
		</Tooltip>
	);
}
