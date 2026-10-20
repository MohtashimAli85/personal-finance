"use client";
import { createContext, use } from "react";
import { useCollapsedGroups } from "@/components/budget/use-collapsed-groups";
import { useGroupDrag } from "@/components/budget/use-group-drag";
import { useGroupOrder } from "@/components/budget/use-group-order";
import { useShowHidden } from "@/components/budget/use-show-hidden";

type BudgetTotals = Pick<BudgetView, "budgeted" | "spent" | "balance">;

interface BudgetProviderProps {
	month: string;
	groups: BudgetGroup[];
	totals: BudgetTotals;
	toBudget: number;
	incomeGroup: BudgetView["incomeGroup"];
}

type BudgetContextType = Omit<BudgetProviderProps, "groups"> &
	ReturnType<typeof useShowHidden> &
	ReturnType<typeof useCollapsedGroups> &
	ReturnType<typeof useGroupDrag> & { orderedGroups: BudgetGroup[] };

const BudgetContext = createContext<BudgetContextType>({} as BudgetContextType);

export const useBudgetContext = () => use(BudgetContext);

const BudgetProvider = ({
	children,
	groups,
	...view
}: BudgetProviderProps & { children: React.ReactNode }) => {
	const hidden = useShowHidden();
	const collapsed = useCollapsedGroups();
	const order = useGroupOrder(groups);
	const drag = useGroupDrag(order);

	return (
		<BudgetContext.Provider
			value={{
				...view,
				...hidden,
				...collapsed,
				...drag,
				orderedGroups: order.orderedGroups,
			}}
		>
			{children}
		</BudgetContext.Provider>
	);
};

export default BudgetProvider;
