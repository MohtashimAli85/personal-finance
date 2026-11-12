const fs = require("node:fs");
const path = require("node:path");

function standaloneDest(context) {
	const productName = context.packager.appInfo.productFilename;
	if (context.electronPlatformName === "darwin") {
		return path.join(
			context.appOutDir,
			`${productName}.app`,
			"Contents",
			"Resources",
			"standalone",
		);
	}
	return path.join(context.appOutDir, "resources", "standalone");
}

function packageNames(dir) {
	return fs.readdirSync(dir).flatMap((name) => {
		if (name.startsWith(".")) return [];
		if (!name.startsWith("@")) return [name];
		return fs.readdirSync(path.join(dir, name)).map((sub) => `${name}/${sub}`);
	});
}

// Windows installers can't hold pnpm's symlinks, so top-level packages become
// plain copies that can't reach their deps inside .pnpm. Hoist them instead.
function hoistPnpmPackages(modulesDir) {
	const pnpmDir = path.join(modulesDir, ".pnpm");
	for (const entry of fs.readdirSync(pnpmDir)) {
		const entryModules = path.join(pnpmDir, entry, "node_modules");
		if (!fs.existsSync(entryModules)) continue;
		for (const name of packageNames(entryModules)) {
			const target = path.join(modulesDir, name);
			if (fs.existsSync(target)) continue;
			fs.cpSync(path.join(entryModules, name), target, {
				recursive: true,
				dereference: true,
			});
		}
	}
}

exports.default = async function afterPack(context) {
	const projectDir = context.packager.projectDir;
	const dest = standaloneDest(context);
	const srcModules = path.join(
		projectDir,
		".next",
		"standalone",
		"node_modules",
	);
	const destModules = path.join(dest, "node_modules");

	if (!fs.existsSync(srcModules)) {
		throw new Error(`Standalone node_modules not found at ${srcModules}`);
	}

	console.log(
		`Copying standalone node_modules from ${srcModules} to ${destModules}`,
	);

	fs.rmSync(destModules, { recursive: true, force: true });
	fs.cpSync(srcModules, destModules, {
		recursive: true,
		dereference: false,
		verbatimSymlinks: true,
	});

	if (context.electronPlatformName === "win32") {
		hoistPnpmPackages(destModules);
	}

	console.log(`✓ Copied standalone node_modules to ${destModules}`);
};
