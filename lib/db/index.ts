import { ensureDatabaseReady } from "./bootstrap";
import { registerShutdownHandlers } from "./shutdown";

ensureDatabaseReady();
registerShutdownHandlers();

export { db, sqlite } from "./client";
export * as schema from "./schema";
