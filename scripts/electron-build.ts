#!/usr/bin/env node

/**
 * Build script for Electron + Next.js
 *
 * Steps:
 * 1. Build Next.js with standalone output
 * 2. Copy static files and public folder into standalone
 * 3. Compile Electron TypeScript files
 * 4. Package with electron-builder
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

function run(cmd: string, label: string) {
	console.log(`\n🔨 ${label}...`);
	execSync(cmd, { stdio: "inherit", cwd: ROOT });
	console.log(`✅ ${label} complete`);
}

function copyDir(src: string, dest: string) {
	if (!fs.existsSync(src)) {
		console.warn(`⚠️  Source not found: ${src}`);
		return;
	}
	fs.cpSync(src, dest, { recursive: true });
}

// 1. Build Next.js
run("npx next build", "Building Next.js");

// 2. Copy static assets into standalone folder
const standalonePath = path.join(ROOT, ".next", "standalone");
const staticSrc = path.join(ROOT, ".next", "static");
const staticDest = path.join(standalonePath, ".next", "static");
const publicSrc = path.join(ROOT, "public");
const publicDest = path.join(standalonePath, "public");

console.log("\n📦 Copying static assets...");
copyDir(staticSrc, staticDest);
copyDir(publicSrc, publicDest);
console.log("✅ Static assets copied");

// 3. Compile Electron TypeScript
run(
	"npx tsc --project electron/tsconfig.json",
	"Compiling Electron TypeScript",
);

// 4. Package with electron-builder
const platform = process.argv[2] || "";
const builderCmd = platform
	? `npx electron-builder ${platform}`
	: "npx electron-builder";

run(
	builderCmd,
	`Packaging with electron-builder${platform ? ` (${platform})` : ""}`,
);

console.log("\n🎉 Build complete! Check the 'release' folder for your app.");
