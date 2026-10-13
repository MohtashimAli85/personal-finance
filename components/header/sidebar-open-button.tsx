"use client";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

export default function SidebarOpenButton() {
	const { state, isMobile } = useSidebar();
	if (state === "expanded" && !isMobile) return null;

	return <SidebarTrigger data-sidebar-peek aria-label="Open sidebar" />;
}
