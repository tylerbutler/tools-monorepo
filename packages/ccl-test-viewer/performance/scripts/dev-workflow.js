#!/usr/bin/env node

import { execSync, spawn } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../..");

class DevWorkflow {
	constructor() {
		this.isRunning = false;
		this.watchers = [];
	}

	async runPerformanceCheck(options = {}) {
		const { quick = false, lighthouse = true, bundle = true } = options;

		console.log("🔍 Running development performance check...");

		try {
			// Build the application
			console.log("📦 Building application...");
			execSync("npm run build", { cwd: projectRoot, stdio: "inherit" });

			const tasks = [];

			// Bundle analysis
			if (bundle) {
				tasks.push(this.runBundleAnalysis());
			}

			// Lighthouse analysis (if not quick mode)
			if (lighthouse && !quick) {
				tasks.push(this.runLighthouseAnalysis());
			}

			await Promise.all(tasks);

			console.log("✅ Performance check completed");
		} catch (error) {
			console.error("❌ Performance check failed:", error.message);
			throw error;
		}
	}

	async runBundleAnalysis() {
		console.log("📊 Analyzing bundle...");

		try {
			execSync("node performance/scripts/analyze-bundle.js", {
				cwd: projectRoot,
				stdio: "inherit",
			});
		} catch (error) {
			console.error("Bundle analysis failed:", error.message);
		}
	}

	async runLighthouseAnalysis() {
		console.log("🔍 Running Lighthouse audit...");

		try {
			// Start preview server
			const server = spawn("npm", ["run", "preview"], {
				cwd: projectRoot,
				stdio: "pipe",
			});

			// Wait for server to start
			await this.waitForServer("http://localhost:4173", 30000);

			// Run Lighthouse
			execSync("npx @lhci/cli@0.12.x autorun", {
				cwd: projectRoot,
				stdio: "inherit",
			});

			// Stop server
			server.kill();
		} catch (error) {
			console.error("Lighthouse analysis failed:", error.message);
		}
	}

	async runQuickCheck() {
		console.log("⚡ Running quick performance check...");
		await this.runPerformanceCheck({ quick: true, lighthouse: false });
	}

	async runFullAudit() {
		console.log("🔬 Running comprehensive performance audit...");
		await this.runPerformanceCheck({
			quick: false,
			lighthouse: true,
			bundle: true,
		});

		// Generate report
		try {
			execSync("node performance/scripts/generate-report.js --detailed", {
				cwd: projectRoot,
				stdio: "inherit",
			});
		} catch (error) {
			console.warn("Report generation failed:", error.message);
		}
	}

	async startPerformanceWatch() {
		if (this.isRunning) {
			console.log("Performance watch is already running");
			return;
		}

		console.log("👀 Starting performance watch mode...");
		this.isRunning = true;

		// Watch for changes in src/, build output, or performance configs
		const { default: chokidar } = await import("chokidar");

		const watcher = chokidar.watch(["src/**/*", "performance/configs/**/*"], {
			cwd: projectRoot,
			ignored: /node_modules/,
			awaitWriteFinish: { stabilityThreshold: 1000 },
		});

		let debounceTimer;

		watcher.on("change", (path) => {
			console.log(`📝 File changed: ${path}`);

			// Debounce changes
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(async () => {
				try {
					await this.runQuickCheck();
				} catch (error) {
					console.error("Performance check failed:", error.message);
				}
			}, 2000);
		});

		this.watchers.push(watcher);

		// Handle graceful shutdown
		process.on("SIGINT", () => {
			this.stopPerformanceWatch();
			process.exit(0);
		});

		console.log("Performance watch started. Press Ctrl+C to stop.");
	}

	stopPerformanceWatch() {
		if (!this.isRunning) return;

		console.log("🛑 Stopping performance watch...");

		for (const watcher of this.watchers) {
			watcher.close();
		}

		this.watchers = [];
		this.isRunning = false;
	}

	async openDashboard() {
		const dashboardPath = join(projectRoot, "performance/dashboard/index.html");

		if (!existsSync(dashboardPath)) {
			console.error("❌ Performance dashboard not found");
			return;
		}

		console.log("📊 Opening performance dashboard...");

		try {
			const { default: open } = await import("open");
			await open(dashboardPath);
		} catch (error) {
			console.log(`📊 Dashboard available at: file://${dashboardPath}`);
		}
	}

	async compareBranches(baseBranch = "main", targetBranch = "HEAD") {
		console.log(`🔀 Comparing performance: ${baseBranch} → ${targetBranch}`);

		try {
			// Store current branch
			const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
				cwd: projectRoot,
				encoding: "utf8",
			}).trim();

			// Test base branch
			console.log(`📊 Testing ${baseBranch}...`);
			execSync(`git checkout ${baseBranch}`, {
				cwd: projectRoot,
				stdio: "pipe",
			});
			await this.runPerformanceCheck({ lighthouse: true, bundle: true });

			const baseResults = this.loadLatestResults();

			// Test target branch
			console.log(`📊 Testing ${targetBranch}...`);
			execSync(`git checkout ${targetBranch}`, {
				cwd: projectRoot,
				stdio: "pipe",
			});
			await this.runPerformanceCheck({ lighthouse: true, bundle: true });

			const targetResults = this.loadLatestResults();

			// Restore original branch
			execSync(`git checkout ${currentBranch}`, {
				cwd: projectRoot,
				stdio: "pipe",
			});

			// Compare results
			this.compareResults(baseResults, targetResults, baseBranch, targetBranch);
		} catch (error) {
			console.error("❌ Branch comparison failed:", error.message);

			// Try to restore original branch
			try {
				const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
					cwd: projectRoot,
					encoding: "utf8",
				}).trim();
				execSync(`git checkout ${currentBranch}`, {
					cwd: projectRoot,
					stdio: "pipe",
				});
			} catch (e) {
				console.error("Failed to restore original branch");
			}
		}
	}

	loadLatestResults() {
		const results = {};

		// Load Lighthouse results
		const lighthousePath = join(projectRoot, ".lighthouseci/links.json");
		if (existsSync(lighthousePath)) {
			try {
				const links = JSON.parse(readFileSync(lighthousePath, "utf8"));
				if (links.length > 0 && existsSync(links[0].jsonPath)) {
					const report = JSON.parse(readFileSync(links[0].jsonPath, "utf8"));
					results.lighthouse = this.extractLighthouseMetrics(report);
				}
			} catch (e) {
				console.warn("Could not load Lighthouse results");
			}
		}

		// Load bundle results
		const bundlePath = join(projectRoot, "perf-data/bundles/latest.json");
		if (existsSync(bundlePath)) {
			try {
				const bundle = JSON.parse(readFileSync(bundlePath, "utf8"));
				results.bundle = bundle.totals;
			} catch (e) {
				console.warn("Could not load bundle results");
			}
		}

		return results;
	}

	extractLighthouseMetrics(report) {
		const categories = report.categories || {};
		const audits = report.audits || {};

		return {
			performance: (categories.performance?.score || 0) * 100,
			accessibility: (categories.accessibility?.score || 0) * 100,
			bestPractices: (categories["best-practices"]?.score || 0) * 100,
			seo: (categories.seo?.score || 0) * 100,
			lcp: audits["largest-contentful-paint"]?.numericValue || 0,
			cls: audits["cumulative-layout-shift"]?.numericValue || 0,
			fid: audits["max-potential-fid"]?.numericValue || 0,
		};
	}

	compareResults(base, target, baseBranch, targetBranch) {
		console.log(`\n📊 Performance Comparison: ${baseBranch} → ${targetBranch}`);
		console.log("=".repeat(60));

		if (base.lighthouse && target.lighthouse) {
			console.log("\n🔍 Lighthouse Scores:");
			this.compareMetric(
				"Performance",
				base.lighthouse.performance,
				target.lighthouse.performance,
				"%",
			);
			this.compareMetric(
				"Accessibility",
				base.lighthouse.accessibility,
				target.lighthouse.accessibility,
				"%",
			);
			this.compareMetric(
				"Best Practices",
				base.lighthouse.bestPractices,
				target.lighthouse.bestPractices,
				"%",
			);
			this.compareMetric(
				"SEO",
				base.lighthouse.seo,
				target.lighthouse.seo,
				"%",
			);

			console.log("\n🚀 Core Web Vitals:");
			this.compareMetric(
				"LCP",
				base.lighthouse.lcp,
				target.lighthouse.lcp,
				"ms",
				true,
			);
			this.compareMetric(
				"CLS",
				base.lighthouse.cls,
				target.lighthouse.cls,
				"",
				true,
			);
			this.compareMetric(
				"FID",
				base.lighthouse.fid,
				target.lighthouse.fid,
				"ms",
				true,
			);
		}

		if (base.bundle && target.bundle) {
			console.log("\n📦 Bundle Analysis:");
			this.compareMetric(
				"Total Size",
				base.bundle.size,
				target.bundle.size,
				"B",
				true,
			);
			this.compareMetric(
				"Gzipped Size",
				base.bundle.gzipSize,
				target.bundle.gzipSize,
				"B",
				true,
			);
			this.compareMetric(
				"File Count",
				base.bundle.count,
				target.bundle.count,
				"",
				true,
			);
		}

		console.log("\n");
	}

	compareMetric(
		name,
		baseValue,
		targetValue,
		unit = "",
		lowerIsBetter = false,
	) {
		const diff = targetValue - baseValue;
		const percentChange = baseValue !== 0 ? (diff / baseValue) * 100 : 0;

		let indicator = "→";
		let color = "";

		if (Math.abs(percentChange) > 1) {
			if (lowerIsBetter) {
				indicator = diff < 0 ? "✅" : "❌";
			} else {
				indicator = diff > 0 ? "✅" : "❌";
			}
		}

		const formattedBase =
			unit === "B"
				? this.formatBytes(baseValue)
				: baseValue.toFixed(unit === "" ? 0 : 1);
		const formattedTarget =
			unit === "B"
				? this.formatBytes(targetValue)
				: targetValue.toFixed(unit === "" ? 0 : 1);
		const formattedDiff =
			unit === "B"
				? this.formatBytes(Math.abs(diff))
				: Math.abs(diff).toFixed(unit === "" ? 0 : 1);

		console.log(
			`${indicator} ${name.padEnd(20)} ${formattedBase} → ${formattedTarget} (${diff >= 0 ? "+" : "-"}${formattedDiff} / ${percentChange.toFixed(1)}%)`,
		);
	}

	async waitForServer(url, timeout = 30000) {
		const start = Date.now();

		while (Date.now() - start < timeout) {
			try {
				const { default: fetch } = await import("node-fetch");
				const response = await fetch(url);
				if (response.ok) return;
			} catch (e) {
				// Server not ready yet
			}

			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		throw new Error(`Server not ready at ${url} after ${timeout}ms`);
	}

	formatBytes(bytes) {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
	}
}

// CLI commands
async function main() {
	const command = process.argv[2];
	const workflow = new DevWorkflow();

	try {
		switch (command) {
			case "check":
				await workflow.runPerformanceCheck();
				break;

			case "quick":
				await workflow.runQuickCheck();
				break;

			case "audit":
				await workflow.runFullAudit();
				break;

			case "watch":
				await workflow.startPerformanceWatch();
				break;

			case "dashboard":
				await workflow.openDashboard();
				break;

			case "compare":
				const baseBranch = process.argv[3] || "main";
				const targetBranch = process.argv[4] || "HEAD";
				await workflow.compareBranches(baseBranch, targetBranch);
				break;

			default:
				console.log(`
🎯 Performance Development Workflow

Commands:
  check      - Run basic performance check (build + bundle analysis)
  quick      - Quick check without Lighthouse
  audit      - Full performance audit with Lighthouse
  watch      - Watch for changes and run quick checks
  dashboard  - Open performance dashboard
  compare    - Compare performance between branches

Examples:
  npm run perf:check
  npm run perf:quick
  npm run perf:audit
  npm run perf:watch
  npm run perf:dashboard
  npm run perf:compare main feature-branch
        `);
				break;
		}
	} catch (error) {
		console.error("❌ Command failed:", error.message);
		process.exit(1);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}

export default DevWorkflow;
