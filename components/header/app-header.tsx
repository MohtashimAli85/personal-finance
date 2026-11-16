"use client";

import Link from "next/link";
import CommandMenu from "@/components/command-menu/command-menu";
import { PrivacyToggle } from "@/components/privacy-toggle";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import BackButton from "./back-button";
import SidebarOpenButton from "./sidebar-open-button";
import { useBreadcrumbs } from "./use-breadcrumbs";

export default function AppHeader() {
	const crumbs = useBreadcrumbs();

	return (
		<header
			data-titlebar-drag
			className="flex h-12 shrink-0 items-center gap-2 border-b px-3 md:grid md:grid-cols-[1fr_minmax(0,18rem)_1fr]"
		>
			<div className="flex shrink-0 items-center gap-1 md:min-w-0">
				<SidebarOpenButton />
				<BackButton />
				{crumbs.length > 1 && (
					<Breadcrumb className="ml-2 hidden min-w-0 md:block">
						<BreadcrumbList className="flex-nowrap">
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link href={crumbs[0].href ?? "/"}>{crumbs[0].label}</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem className="min-w-0">
								<BreadcrumbPage className="truncate">
									{crumbs[1].label}
								</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				)}
			</div>
			<CommandMenu />
			<div className="flex shrink-0 justify-end">
				<PrivacyToggle />
			</div>
		</header>
	);
}
