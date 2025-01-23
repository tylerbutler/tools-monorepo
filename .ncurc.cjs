// @ts-check

/** @type {import("npm-check-updates").RunOptions} */
const config = {
	dep: ["dev", "optional", "peer"],
	target: "semver",
	reject: [
		// Upgrade these separately/manually
		"@types/node",
		/.*oclif.*/,
		"typescript",
	],
	root: true,
	upgrade: true,
	workspaces: true,
	// minimal: true,
};

module.exports = config;
