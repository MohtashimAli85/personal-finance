import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	output: "standalone",
	reactCompiler: true,
	serverExternalPackages: ["better-sqlite3"],
	allowedDevOrigins: ["http://127.0.0.1:3000", "http://localhost:3000"],
	// cacheComponents: true,
};

export default nextConfig;
