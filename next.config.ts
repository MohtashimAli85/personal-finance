import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "standalone",
	reactCompiler: true,
	serverExternalPackages: [
		"better-sqlite3",
		"imapflow",
		"mailparser",
		"node-llama-cpp",
	],
	// node-llama-cpp picks its prebuilt binary package at runtime, which file
	// tracing cannot see.
	outputFileTracingIncludes: {
		"/**": [
			"./node_modules/.pnpm/node-llama-cpp@*/node_modules/@node-llama-cpp/**",
			"./node_modules/.pnpm/@node-llama-cpp+*/**",
		],
	},
	outputFileTracingExcludes: { "/**": ["./models/**"] },
	experimental: { serverActions: { bodySizeLimit: "200mb" } },
	allowedDevOrigins: ["127.0.0.1"],
	// cacheComponents: true,
};

export default nextConfig;
