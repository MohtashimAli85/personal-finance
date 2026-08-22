"use client";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BudgetGroupMenuProps {
  onAddCategory?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}

const BudgetGroupMenu = ({
  onAddCategory,
  onRename,
  onDelete,
}: BudgetGroupMenuProps) => {
  return (
    <>
      {onAddCategory && (
        <Button
          type="button"
          variant="table"
          size="icon-xs"
          onClick={onAddCategory}
          title="Add category"
        >
          <Plus />
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="table" size="icon-xs">
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onAddCategory && (
            <DropdownMenuItem onSelect={onAddCategory}>
              Add category
            </DropdownMenuItem>
          )}
          {onRename && (
            <DropdownMenuItem onSelect={onRename}>
              Rename group
            </DropdownMenuItem>
          )}
          {onDelete && (
            <DropdownMenuItem className="text-destructive" onSelect={onDelete}>
              Delete group
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default BudgetGroupMenu;
