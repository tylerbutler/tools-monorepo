import process from "node:process";
import { getViteConfig } from "astro/config";

// biome-ignore lint/style/noDefaultExport: correct pattern for config files
export default getViteConfig({
	test: {
		globals: true,
		watch: false,
		testTimeout: process.env.GITHUB_ACTIONS ? 15_000 : 5000,
		reporters: process.env.GITHUB_ACTIONS
			? ["github-actions", "junit"]
			: ["verbose", "junit"],
		outputFile: { junit: "./_temp/junit.xml" },
		coverage: {
			include: ["src/**"],
			exclude: [
				"**/*.json",
				"**/*.md",
				"**/*.yaml",
				"**/*.yml",
				"**/fixtures/**",
				"**/test/data/**",
			],
			provider: "v8",
			reporter: ["text", "json", "html", "cobertura"],
			reportsDirectory: ".coverage/vitest",
		},
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/cypress/**",
			"**/.{idea,git,cache,output,temp}/**",
			"**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
			"**/fixtures/**",
		],
	},
});
