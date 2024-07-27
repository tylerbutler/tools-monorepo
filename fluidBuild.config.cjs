// @ts-check

/** @type {import("@fluidframework/build-tools").IFluidBuildConfig} */
const config = {
	repoPackages: {
		main: {
			directory: "",
			ignoredDirs: [],
			defaultInterdependencyRange: "workspace:^",
		},
	},
	tasks: {
		api: {
			dependsOn: ["compile"],
		},
		build: {
			dependsOn: ["^build", "compile", "api", "docs", "manifest", "readme"],
			script: false,
		},
		docs: {
			dependsOn: [],
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
