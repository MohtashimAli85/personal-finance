#!/usr/bin/env node

/**
 * Build script for Electron + Next.js
 *
 * Steps:
 * 1. Rebuild native modules for current arch
 * 2. Build Next.js with standalone output
 * 3. Copy static files and public folder into standalone
 * 4. Compile Electron TypeScript files
 * 5. Package with electron-builder
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

function removeDanglingSymlinks(dir: string) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isSymbolicLink()) {
			if (!fs.existsSync(fullPath)) {
				fs.unlinkSync(fullPath);
				console.log(`🗑️  Removed dangling symlink: ${fullPath}`);
			}
		} else if (entry.isDirectory()) {
			removeDanglingSymlinks(fullPath);
		}
	}
}

run("pnpm rebuild better-sqlite3", "Rebuilding native modules");

run("npx next build", "Building Next.js");

run(
	"npx electron-rebuild -f -w better-sqlite3",
	"Rebuilding better-sqlite3 for Electron ABI",
);

const standalonePath = path.join(ROOT, ".next", "standalone");
const staticSrc = path.join(ROOT, ".next", "static");
const staticDest = path.join(standalonePath, ".next", "static");
const publicSrc = path.join(ROOT, "public");
const publicDest = path.join(standalonePath, "public");
const drizzleSrc = path.join(ROOT, "drizzle");
const drizzleDest = path.join(standalonePath, "drizzle");

console.log("\n📦 Copying static assets...");
copyDir(staticSrc, staticDest);
copyDir(publicSrc, publicDest);
copyDir(drizzleSrc, drizzleDest);

const standaloneModules = path.join(standalonePath, "node_modules");
if (fs.existsSync(standaloneModules)) {
	removeDanglingSymlinks(standaloneModules);
}

function findPnpmPackageDir(packageName: string): string | null {
	const pnpmDir = path.join(ROOT, "node_modules", ".pnpm");
	if (!fs.existsSync(pnpmDir)) return null;
	const entry = fs
		.readdirSync(pnpmDir)
		.find((name) => name.startsWith(`${packageName}@`));
	return entry ? path.join(pnpmDir, entry) : null;
}

console.log("\n🔧 Syncing Electron-built native module into standalone...");
const nativeModuleName = "better-sqlite3";
const nativePnpmEntryDir = findPnpmPackageDir(nativeModuleName);
if (!nativePnpmEntryDir) {
	throw new Error(`Could not locate ${nativeModuleName} in node_modules/.pnpm`);
}
const nativeDestDir = path.join(
	standaloneModules,
	".pnpm",
	path.basename(nativePnpmEntryDir),
	"node_modules",
	nativeModuleName,
);
if (!fs.existsSync(nativeDestDir)) {
	throw new Error(
		`Could not locate standalone ${nativeModuleName} dir: ${nativeDestDir}`,
	);
}
const nativeSourceDir = path.join(
	nativePnpmEntryDir,
	"node_modules",
	nativeModuleName,
);
fs.cpSync(path.join(nativeSourceDir, "build"), path.join(nativeDestDir, "build"), {
	recursive: true,
	force: true,
});
console.log(`✅ Synced ${nativeModuleName} native module into standalone`);

console.log("✅ Static assets copied");

run(
	"npx tsc --project electron/tsconfig.json",
	"Compiling Electron TypeScript",
);

const platform = process.argv[2] || "";
const builderCmd = platform
	? `npx electron-builder ${platform}`
	: "npx electron-builder";

run(
	builderCmd,
	`Packaging with electron-builder${platform ? ` (${platform})` : ""}`,
);

console.log("\n🎉 Build complete! Check the 'release' folder for your app.");

run(
	"pnpm rebuild better-sqlite3",
	"Restoring native modules for local dev (system Node)",
);
