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

	console.log(`Copying standalone node_modules from ${srcModules} to ${destModules}`);

	fs.rmSync(destModules, { recursive: true, force: true });
	fs.cpSync(srcModules, destModules, {
		recursive: true,
		dereference: false,
		verbatimSymlinks: true,
	});

	console.log(`✓ Copied standalone node_modules to ${destModules}`);
};
