/** @type {import('@tylerbu/sail').ISailConfig} */
module.exports = {
	version: 1,
	tasks: {
		build: {
			dependsOn: ["^build"],
			script: true,
			cache: {
				inputs: ["src/**/*.ts", "tsconfig.json", "package.json"],
				outputs: ["dist/**"],
			},
		},
		test: {
			dependsOn: ["build"],
			script: true,
			cache: {
				inputs: ["test/**/*.ts", "src/**/*.ts", "package.json"],
				outputs: [".coverage/**"],
			},
		},
		lint: {
			dependsOn: ["^build"],
			script: true,
			cache: {
				inputs: ["src/**/*.ts", "test/**/*.ts"],
				outputs: [".lint-output"],
			},
		},
	},
};
