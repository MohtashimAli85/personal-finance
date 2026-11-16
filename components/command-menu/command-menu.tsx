"use client";

import {
	Eye,
	EyeOff,
	Keyboard,
	Landmark,
	PanelLeft,
	Plus,
	SearchIcon,
} from "lucide-react";
import { Money } from "@/components/money";
import ShortcutKeys from "@/components/shortcut-keys";
import { navLinks } from "@/components/sidebar/nav-links";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandShortcut,
} from "@/components/ui/command";
import { SHORTCUTS } from "@/lib/shortcuts";
import { THEME_OPTIONS } from "@/lib/theme-options";
import ShortcutsDialog from "./shortcuts-dialog";
import { useCommandMenu } from "./use-command-menu";

export default function CommandMenu() {
	const menu = useCommandMenu();
	const { hidden, toggle } = menu.privacy;

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				onClick={() => menu.setOpen(true)}
				className="min-w-0 flex-1 justify-start font-normal text-muted-foreground md:w-full md:max-w-72"
			>
				<SearchIcon />
				<span className="truncate">Search or jump to…</span>
				<ShortcutKeys
					keys={SHORTCUTS.search.keys}
					className="ml-auto max-sm:hidden"
				/>
			</Button>
			<CommandDialog
				open={menu.open}
				onOpenChange={menu.setOpen}
				title="Search or jump to"
				description="Go to a page or account, or run an action."
			>
				<Command>
					<CommandInput placeholder="Type a page, account or action" />
					<CommandList>
						<CommandEmpty>Nothing matches that.</CommandEmpty>
						<CommandGroup heading="Actions">
							<CommandItem onSelect={() => menu.run(menu.addTransaction)}>
								<Plus />
								Add transaction
								<CommandShortcut>
									{menu.shortcut(SHORTCUTS.addTransaction.keys)}
								</CommandShortcut>
							</CommandItem>
							<CommandItem onSelect={() => menu.run(toggle)}>
								{hidden ? <Eye /> : <EyeOff />}
								{hidden ? "Show amounts" : "Hide amounts"}
								<CommandShortcut>
									{menu.shortcut(SHORTCUTS.privacy.keys)}
								</CommandShortcut>
							</CommandItem>
							<CommandItem onSelect={() => menu.run(menu.toggleSidebar)}>
								<PanelLeft />
								Toggle sidebar
								<CommandShortcut>
									{menu.shortcut(SHORTCUTS.sidebar.keys)}
								</CommandShortcut>
							</CommandItem>
							<CommandItem
								onSelect={() => menu.run(() => menu.setHelpOpen(true))}
							>
								<Keyboard />
								Keyboard shortcuts
								<CommandShortcut>
									{menu.shortcut(SHORTCUTS.help.keys)}
								</CommandShortcut>
							</CommandItem>
						</CommandGroup>
						<CommandGroup heading="Theme">
							{THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
								<CommandItem
									key={value}
									value={`theme ${label}`}
									onSelect={() => menu.run(() => menu.setTheme(value))}
								>
									<Icon />
									{label} theme
								</CommandItem>
							))}
						</CommandGroup>
						<CommandGroup heading="Pages">
							{navLinks.map(({ href, label, icon: Icon }) => (
								<CommandItem
									key={href}
									value={`page ${label}`}
									onSelect={() => menu.run(() => menu.go(href))}
								>
									<Icon />
									{label}
								</CommandItem>
							))}
						</CommandGroup>
						{menu.accounts.length > 0 && (
							<CommandGroup heading="Accounts">
								{menu.accounts.map((account) => (
									<CommandItem
										key={account.id}
										value={`account ${account.name} ${account.id}`}
										onSelect={() =>
											menu.run(() => menu.go(`/transactions/${account.id}`))
										}
									>
										<Landmark />
										{account.name}
										<Money
											value={account.balance}
											className="ml-auto text-xs text-muted-foreground"
										/>
									</CommandItem>
								))}
							</CommandGroup>
						)}
					</CommandList>
				</Command>
			</CommandDialog>
			<ShortcutsDialog open={menu.helpOpen} onOpenChange={menu.setHelpOpen} />
		</>
	);
}
