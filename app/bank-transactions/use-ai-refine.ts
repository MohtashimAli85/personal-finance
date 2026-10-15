import { useState } from "react";
import { refineBankTransactionsWithAi } from "@/app/actions/bank/ai-refine";

export function useAiRefine() {
	const [isRefining, setIsRefining] = useState(false);

	const refine = async () => {
		setIsRefining(true);
		try {
			await refineBankTransactionsWithAi();
		} catch (error) {
			console.error("AI refine failed:", error);
		} finally {
			setIsRefining(false);
		}
	};

	return { isRefining, refine };
}
