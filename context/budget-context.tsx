"use client";
import { createContext, use, useEffect, useRef, useState } from "react";
import { reorderBudgetGroups } from "@/app/actions/budget/mutations";

const moveGroup = (groups: BudgetGroup[], fromId: string, toId: string) => {
  const fromIndex = groups.findIndex((g) => g.id === fromId);
  const toIndex = groups.findIndex((g) => g.id === toId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex)
    return groups;
  const next = [...groups];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

interface BudgetContextType {
  month: string;
  orderedGroups: BudgetGroup[];
  collapsedGroups: Record<string, boolean>;
  toggleCollapsed: (groupId: string) => void;
  onDragStart: (groupId: string) => void;
  onDragEnter: (targetGroupId: string) => void;
  onDragEnd: () => void;
}

const BudgetContext = createContext<BudgetContextType>({} as BudgetContextType);

export const useBudgetContext = () => use(BudgetContext);

const BudgetProvider = ({
  children,
  month,
  groups,
}: {
  children: React.ReactNode;
  month: string;
  groups: BudgetGroup[];
}) => {
  // --- Group ordering (syncs with server props) ---
  const [prevGroups, setPrevGroups] = useState(groups);
  const [groupOrder, setGroupOrder] = useState(() => groups.map((g) => g.id));
  const groupOrderRef = useRef(groupOrder);

  if (prevGroups !== groups) {
    setPrevGroups(groups);
    setGroupOrder(groups.map((g) => g.id));
  }

  useEffect(() => {
    groupOrderRef.current = groupOrder;
  }, [groupOrder]);

  const byId = new Map(groups.map((g) => [g.id, g]));
  const ordered = groupOrder
    .map((id) => byId.get(id))
    .filter((g): g is BudgetGroup => Boolean(g));
  const seen = new Set(ordered.map((g) => g.id));
  const orderedGroups = [...ordered, ...groups.filter((g) => !seen.has(g.id))];

  // --- Collapse state ---
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});

  const toggleCollapsed = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // --- Drag reorder ---
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null);
  const dragStartOrderRef = useRef<string[] | null>(null);

  const onDragStart = (groupId: string) => {
    setDraggingGroupId(groupId);
    dragStartOrderRef.current = groupOrderRef.current;
  };

  const onDragEnter = (targetGroupId: string) => {
    if (!draggingGroupId || draggingGroupId === targetGroupId) return;
    const dragged = orderedGroups.find((g) => g.id === draggingGroupId);
    const target = orderedGroups.find((g) => g.id === targetGroupId);
    if (!dragged || !target) return;
    if (dragged.is_income || target.is_income) return;
    const next = moveGroup(orderedGroups, draggingGroupId, targetGroupId);
    const ids = next.map((g) => g.id);
    groupOrderRef.current = ids;
    setGroupOrder(ids);
  };

  const onDragEnd = () => {
    const start = dragStartOrderRef.current?.join(",") ?? "";
    const end = groupOrderRef.current.join(",");
    if (start && start !== end) {
      const nonIncomeIds = groupOrderRef.current.filter((id) => {
        const g = byId.get(id);
        return g && !g.is_income;
      });
      reorderBudgetGroups(nonIncomeIds);
    }
    setDraggingGroupId(null);
    dragStartOrderRef.current = null;
  };

  return (
    <BudgetContext.Provider
      value={{
        month,
        orderedGroups,
        collapsedGroups,
        toggleCollapsed,
        onDragStart,
        onDragEnter,
        onDragEnd,
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
};

export default BudgetProvider;
