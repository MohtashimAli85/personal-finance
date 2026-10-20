export async function register() {
	if (process.env.NEXT_RUNTIME !== "nodejs") return;
	const { ensureDatabaseReady } = await import("@/lib/db/bootstrap");
	const { registerShutdownHandlers } = await import("@/lib/db/shutdown");
	ensureDatabaseReady();
	registerShutdownHandlers();
}
