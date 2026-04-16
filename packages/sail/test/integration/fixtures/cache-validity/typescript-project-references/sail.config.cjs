/** @type {import('@tylerbu/sail').ISailConfig} */
module.exports = {
	version: 1,
	tasks: {
		build: {
			dependsOn: ["^build", "build:gen"],
			script: true,
		},
		"build:gen": {
			dependsOn: [],
			script: true,
		},
		"build:test:esm": {
			dependsOn: ["build"],
			script: true,
		},
		"build:test:cjs": {
			dependsOn: ["build"],
			script: true,
		},
		"build:test:no-exact": {
			dependsOn: ["build"],
			script: true,
		},
	},
};
