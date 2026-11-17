#!/usr/bin/env node
import { execSync } from "node:child_process";

/**
 * Lists all packages in the workspace with their name and private/published status
 */
function listWorkspacePackages() {
	try {
		// Get all packages using pnpm list
		const output = execSync("pnpm list -r --depth 0 --json", {
			encoding: "utf8",
			stdio: ["pipe", "pipe", "inherit"],
		});

		const packages = JSON.parse(output);

		// Create formatted output
		const packageList = packages
			.filter((pkg) => pkg.name) // Filter out packages without names
			.map((pkg) => ({
				name: pkg.name,
				status: pkg.private ? "🔒 Private" : "📦 Published",
				path: pkg.path?.replace(process.cwd(), ".") || "",
			}))
			.sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

		// Print header
		console.log("\n📋 Workspace Packages\n");
		console.log("Name".padEnd(50), "Status".padEnd(15), "Path");
		console.log("─".repeat(100));

		// Print each package
		for (const pkg of packageList) {
			console.log(pkg.name.padEnd(50), pkg.status.padEnd(15), pkg.path);
		}

		console.log("\n");
		console.log(`Total: ${packageList.length} packages`);
		console.log(
			`Private: ${packageList.filter((p) => p.status.includes("Private")).length}`,
		);
		console.log(
			`Published: ${packageList.filter((p) => p.status.includes("Published")).length}`,
		);
		console.log("");
	} catch (error) {
		console.error("Error listing packages:", error.message);
		process.exit(1);
	}
}

listWorkspacePackages();
