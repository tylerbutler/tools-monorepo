const base = require("./.ncurc.base.cjs");

// @ts-check

/** @type {import("npm-check-updates").RunOptions} */
const config = {
	...base,
	dep: ["prod", "dev", "optional", "peer"],
	filter: ["/.*oclif.*/"],
};

module.exports = config;
