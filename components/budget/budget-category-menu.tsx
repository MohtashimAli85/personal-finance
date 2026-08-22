"use client";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BudgetCategoryMenuProps {
  onRename: () => void;
  onDelete: () => void;
}

const BudgetCategoryMenu = ({
  onRename,
  onDelete,
}: BudgetCategoryMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
        className="opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Button type="button" variant="table" size="icon-xs">
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onRename}>Rename</DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onSelect={onDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default BudgetCategoryMenu;
