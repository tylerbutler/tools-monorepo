// @ts-check

/** @type {import("@fluidframework/build-tools").IFluidBuildConfig} */
const config = {
	version: 1,
	repoPackages: {
		client: {
			directory: "",
			ignoredDirs: [],
			defaultInterdependencyRange: "workspace:^",
		},
	},
	tasks: {
		api: {
			dependsOn: ["^compile", "compile"],
		},
		build: {
			dependsOn: [
				"^build",
				"compile",
				"build:test",
				"api",
				"docs",
				"generate",
				"manifest",
				"readme",
			],
			script: false,
		},
		docs: {
			dependsOn: ["^compile", "compile", "api"],
		},
		clean: {
			before: ["*"],
		},
		"clean:build": {
			before: ["*"],
		},
		"clean:manifest": {
			before: ["*"],
		},
		compile: {
			dependsOn: ["^compile"],
		},
		full: {
			dependsOn: ["check", "build", "api", "docs", "lint", "test"],
			script: false,
		},
		lint: {
			dependsOn: ["compile"],
		},
		manifest: ["compile"],
		readme: ["compile", "manifest"],
		release: {
			dependsOn: ["build", "generate:license-file"],
			script: false,
		},
		test: {
			dependsOn: ["compile"],
		},
	},
	multiCommandExecutables: ["astro", "oclif"],
	declarativeTasks: {
		"astro build": {
			inputGlobs: ["astro.config.mjs", "src/**", "public/**"],
			outputGlobs: ["dist/**"],
		},
		"astro check": {
			inputGlobs: ["astro.config.mjs", "src/**", "public/**"],
			outputGlobs: [],
		},
		"generate-license-file": {
			inputGlobs: ["package.json", ".generatelicensefile.cjs"],
			outputGlobs: ["THIRD-PARTY-LICENSES.txt"],
		},
		"oclif manifest": {
			inputGlobs: ["package.json", "src/**"],
			outputGlobs: ["oclif.manifest.json"],
		},
		"oclif readme": {
			inputGlobs: ["package.json", "src/**"],
			outputGlobs: ["README.md", "docs/**"],
		},
	},
};

module.exports = config;
