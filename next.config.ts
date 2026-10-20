import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "standalone",
	reactCompiler: true,
	serverExternalPackages: ["better-sqlite3", "imapflow", "mailparser"],
	experimental: { serverActions: { bodySizeLimit: "200mb" } },
	allowedDevOrigins: ["127.0.0.1"],
	// cacheComponents: true,
};

export default nextConfig;
