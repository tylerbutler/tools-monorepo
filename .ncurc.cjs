// @ts-check

/** @type {import("npm-check-updates").RunOptions} */
const config = {
	dep: ["dev", "optional", "peer"],
	target: "minor",
	reject: ["@types/node", /^.*oclif.*/],

	root: true,
	upgrade: true,
	workspaces: true,
};

module.exports = config;
