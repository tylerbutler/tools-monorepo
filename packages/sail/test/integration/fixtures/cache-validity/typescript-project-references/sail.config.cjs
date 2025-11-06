/** @type {import('@tylerbu/sail').ISailConfig} */
module.exports = {
	version: 1,
	tasks: {
		build: {
			dependsOn: ["^build", "build:gen"],
			script: true,
			cache: {
				inputs: ["src/**/*.ts", "!src/test/**", "tsconfig.json", "package.json"],
				outputs: ["dist/*.js", "dist/*.d.ts", "dist/*.map", "*.tsbuildinfo"],
			},
		},
		"build:gen": {
			dependsOn: [],
			script: true,
			cache: {
				inputs: ["src/**/*.ts", "!src/test/**"],
				outputs: ["dist/gen/**"],
			},
		},
		"build:test:esm": {
			dependsOn: ["build"],
			script: true,
			cache: {
				inputs: ["src/test/**/*.ts", "src/test/tsconfig.json"],
				outputs: ["dist/test/**", "src/test/*.tsbuildinfo"],
			},
		},
		"build:test:cjs": {
			dependsOn: ["build"],
			script: true,
			cache: {
				inputs: ["src/test/**/*.ts", "src/test/tsconfig.cjs.json"],
				outputs: ["dist/test-cjs/**", "src/test/*.tsbuildinfo"],
			},
		},
		"build:test:no-exact": {
			dependsOn: ["build"],
			script: true,
			cache: {
				inputs: ["src/test/**/*.ts", "src/test/tsconfig.no-exactOptionalPropertyTypes.json"],
				outputs: ["dist/test-no-exact/**", "src/test/*.tsbuildinfo"],
			},
		},
	},
};
