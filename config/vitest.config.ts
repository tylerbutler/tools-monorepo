import { defineConfig } from "vitest/config";

const config = defineConfig({
	test: {
		reporters: process.env.GITHUB_ACTIONS
			? ["verbose", "github-actions"]
			: ["verbose"],
		coverage: {
			include: ["src/**"],
			provider: "v8",
			reporter: ["text", "json", "html"],
			reportsDirectory: "_temp/coverage",
		},
	},
});

export default config;
