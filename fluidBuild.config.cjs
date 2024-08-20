// @ts-check

/** @type {import("@fluidframework/build-tools").IFluidBuildConfig} */
const config = {
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
		test: {
			dependsOn: ["compile"],
		},
	},
};

module.exports = config;
