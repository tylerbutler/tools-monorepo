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
		build: {
			dependsOn: ["^build", "compile", "docs", "manifest", "readme"],
			script: false,
		},
		docs: {
			dependsOn: ["compile"],
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
			dependsOn: ["check", "build", "lint", "test"],
			script: false,
		},
		lint: {
			dependsOn: ["compile"],
		},
		manifest: ["compile"],
		readme: ["compile"],
		test: {
			dependsOn: ["build"],
		},
	},
};

module.exports = config;
