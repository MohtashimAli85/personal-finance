"use client";

import Link from "next/link";
import { Fragment } from "react";
import { PrivacyToggle } from "@/components/privacy-toggle";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import BackButton from "./back-button";
import SidebarOpenButton from "./sidebar-open-button";
import { useBreadcrumbs } from "./use-breadcrumbs";

export default function AppHeader() {
	const crumbs = useBreadcrumbs();

	return (
		<header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
			<SidebarOpenButton />
			<BackButton />
			<Separator orientation="vertical" className="mr-2 my-auto h-4" />
			<Breadcrumb>
				<BreadcrumbList>
					{crumbs.map((crumb, index) => (
						<Fragment key={crumb.href ?? crumb.label}>
							{index > 0 && <BreadcrumbSeparator />}
							<BreadcrumbItem>
								{crumb.href ? (
									<BreadcrumbLink asChild>
										<Link href={crumb.href}>{crumb.label}</Link>
									</BreadcrumbLink>
								) : (
									<BreadcrumbPage>{crumb.label}</BreadcrumbPage>
								)}
							</BreadcrumbItem>
						</Fragment>
					))}
				</BreadcrumbList>
			</Breadcrumb>
			<PrivacyToggle className="ml-auto" />
		</header>
	);
}
