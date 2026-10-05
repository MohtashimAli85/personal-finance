import type { Metadata } from "next";
import { connection } from "next/server";
import { getAiKeyStatus, getProfile } from "@/lib/settings";
import SettingsClient from "./settings-client";

export const metadata: Metadata = {
	title: "Settings - Personal Finance",
	description: "Your profile for the AI coach, and AI provider keys",
};

export default async function SettingsPage() {
	await connection();
	const status = getAiKeyStatus();
	return <SettingsClient status={status} profile={getProfile()} />;
}
