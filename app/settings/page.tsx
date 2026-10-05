import type { Metadata } from "next";
import { connection } from "next/server";
import { getAiKeyStatus } from "@/lib/settings";
import SettingsClient from "./settings-client";

export const metadata: Metadata = {
	title: "Settings - Personal Finance",
	description: "AI provider keys and app settings",
};

export default async function SettingsPage() {
	await connection();
	const status = getAiKeyStatus();
	return <SettingsClient status={status} />;
}
