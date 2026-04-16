/** @type {import('@tylerbu/sail').ISailConfig} */
module.exports = {
	version: 1,
	tasks: {
		build: {
			dependsOn: ["^build"],
			script: true,
		},
		test: {
			dependsOn: ["build"],
			script: true,
		},
		lint: {
			dependsOn: ["^build"],
			script: true,
		},
	},
};
