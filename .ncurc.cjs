// @ts-check

/** @type {import("npm-check-updates").RunOptions} */
const config = {
	root: true,
	upgrade: true,
	verbose: true,
	workspaces: true,
	dep: ["dev", "optional", "packageManager"],
};

module.exports = config;
