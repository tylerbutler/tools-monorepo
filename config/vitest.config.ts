import { defineConfig } from "vitest/config";

const config = defineConfig({
	test: {
		reporters: process.env.GITHUB_ACTIONS
			? // CI mode
				["github-actions", "junit"]
			: // local mode
				["verbose", "junit"],
		outputFile: {
			junit: "./_temp/junit.xml",
		},
		coverage: {
			include: ["src/**"],
			provider: "v8",
			reporter: ["text", "json", "html"],
			reportsDirectory: ".coverage/vitest",
		},
	},
});

// biome-ignore lint/style/noDefaultExport: correct pattern for config files
export default config;
