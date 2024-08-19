import { defineConfig } from "vitest/config";

const config = defineConfig({
	test: {
		reporters: process.env.GITHUB_ACTIONS
			? ["github-actions", "junit"]
			: ["verbose", "junit"],
		outputFile: {
			junit: "./_temp/junit.xml",
		},
		coverage: {
			include: ["src/**"],
			provider: "v8",
			reporter: ["text", "json", "html"],
			reportsDirectory: "_temp/coverage",
		},
	},
});

export default config;
