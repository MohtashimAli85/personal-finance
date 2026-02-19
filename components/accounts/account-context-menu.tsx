import type { RefObject } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { DialogTrigger } from "../ui/dialog";

interface AccountContextMenuProps {
  children: React.ReactNode;
  ref: RefObject<HTMLDivElement | null>;
}
const AccountContextMenu = ({ children, ref }: AccountContextMenuProps) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => {
            const inputEl = ref.current?.children[0] as HTMLInputElement;
            inputEl?.removeAttribute("hidden");
            const labelEl = ref.current?.children[1] as HTMLSpanElement;
            labelEl?.setAttribute("hidden", "true");
            setTimeout(() => {
              // inputEl?.focus();
              inputEl?.select();
            }, 300);
          }}
        >
          Rename
        </ContextMenuItem>
        <ContextMenuItem asChild className="w-full">
          <DialogTrigger>Close</DialogTrigger>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default AccountContextMenu;
