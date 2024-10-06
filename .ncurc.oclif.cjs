const base = require("./.ncurc.cjs");

// @ts-check

/** @type {import("npm-check-updates").RunOptions} */
const config = {
	...base,
	dep: ["prod", "dev", "optional", "peer"],
	filter: [/.*oclif.*/],
	reject: [],
};

module.exports = config;
