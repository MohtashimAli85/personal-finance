import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { DialogTrigger } from "../ui/dialog";

interface AccountContextMenuProps {
  children: React.ReactNode;
  onRename: () => void;
}
const AccountContextMenu = ({
  children,
  onRename,
}: AccountContextMenuProps) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onRename}>Rename</ContextMenuItem>
        <ContextMenuItem asChild className="w-full">
          <DialogTrigger>Close</DialogTrigger>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default AccountContextMenu;
