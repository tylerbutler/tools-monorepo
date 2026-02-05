import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	timeout: 60_000,
	expect: {
		timeout: 10_000,
	},
	fullyParallel: false, // Run tests sequentially to avoid port conflicts
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 1,
	workers: 1, // Single worker for WebSocket-based tests
	reporter: process.env.CI ? "github" : "list",

	globalSetup: "./e2e/global-setup.ts",

	use: {
		baseURL: "http://localhost:3000",
		trace: "on-first-retry",
		video: "on-first-retry",
	},

	webServer: {
		command: "pnpm dev",
		url: "http://localhost:3000",
		reuseExistingServer: false, // Always start fresh to avoid module caching
		timeout: 30_000,
	},

	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
});
