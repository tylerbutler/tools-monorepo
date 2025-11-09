/** @type {import('@tylerbu/sail').ISailConfig} */
module.exports = {
	version: 1,
	tasks: {
		build: {
			dependsOn: ["^build"],
			script: true,
		},
		clean: {
			script: true,
		},
	},
};
