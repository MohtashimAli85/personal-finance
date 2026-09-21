import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": import.meta.dirname,
		},
	},
	test: {
		environment: "node",
		include: ["**/*.test.ts"],
		exclude: ["node_modules", ".next", "dist-electron", "release"],
		// Each test file gets its own temp SQLite DB via lib/db test-utils
		// (see test/db-test-utils.ts) - no shared state, no network, no mocks
		// of the actual database layer.
		fileParallelism: true,
	},
});
