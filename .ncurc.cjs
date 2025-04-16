// const base = require("./.ncurc.base.cjs");

// @ts-check

/** @type {import("npm-check-updates").RunOptions} */
const config = {
	root: true,
	workspaces: true,

	// dep: ["dev", "optional", "peer"],
	reject: [
		// Upgrade these separately/manually
		"@types/node",
		"typescript",
	],
};

module.exports = config;
