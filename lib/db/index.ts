import { bootstrapDatabase } from "./bootstrap";

bootstrapDatabase();

export { db, sqlite } from "./client";
export * as schema from "./schema";
