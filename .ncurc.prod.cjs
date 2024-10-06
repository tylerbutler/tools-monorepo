const base = require("./.ncurc.base.cjs");

// @ts-check

/** @type {import("npm-check-updates").RunOptions} */
const config = {
	...base,
	dep: ["dev", "optional", "packageManager"],
};

module.exports = config;
