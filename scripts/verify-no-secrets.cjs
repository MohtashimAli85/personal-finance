// beforePack hook: refuse to package if secrets or real user data would be
// bundled into the installer. Runs against the staged extraResources sources
// before electron-builder copies them into the app.
const fs = require("node:fs");
const path = require("node:path");

const FORBIDDEN_NAMES = [".env", ".env.local", ".env.production"];
const FORBIDDEN_PREFIXES = ["db.sqlite"];

function scan(dir, hits) {
	if (!fs.existsSync(dir)) return;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === "node_modules") continue;
			scan(full, hits);
			continue;
		}
		if (
			FORBIDDEN_NAMES.includes(entry.name) ||
			FORBIDDEN_PREFIXES.some((p) => entry.name.startsWith(p))
		) {
			hits.push(full);
		}
	}
}

exports.default = async function beforePack(context) {
	const projectDir = context.packager.info.projectDir ?? context.projectDir;
	const standalonePath = path.join(projectDir, ".next", "standalone");
	const hits = [];
	scan(standalonePath, hits);
	if (hits.length > 0) {
		throw new Error(
			`Refusing to package: secrets or a real database were found in the build output:\n` +
				hits.map((h) => `  - ${h}`).join("\n") +
				`\nDelete .next/ and rebuild with \`pnpm next build\` from a clean checkout.`,
		);
	}
	console.log("✓ No secrets or local database found in build output");
};
