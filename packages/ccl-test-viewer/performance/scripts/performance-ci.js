#!/usr/bin/env node

import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../..");

class PerformanceCI {
	constructor() {
		this.config = this.loadConfig();
		this.currentResults = {};
		this.baselineResults = {};
		this.regressions = [];
	}

	loadConfig() {
		const configPath = join(__dirname, "../configs/budgets.json");
		if (existsSync(configPath)) {
			return JSON.parse(readFileSync(configPath, "utf8"));
		}
		return this.getDefaultConfig();
	}

	getDefaultConfig() {
		return {
			thresholds: {
				performance: { min: 90, regression: 5 },
				bundleSize: { max: 1024000, regression: 0.1 }, // 1MB, 10% regression threshold
				lcp: { max: 2500, regression: 300 },
				cls: { max: 0.1, regression: 0.05 },
				fid: { max: 100, regression: 50 },
			},
			alerts: {
				slackWebhook: process.env.SLACK_WEBHOOK_URL,
				emailNotifications: process.env.EMAIL_NOTIFICATIONS === "true",
			},
		};
	}

	async runPerformanceCheck() {
		try {
			console.log("🔍 Running performance regression check...");

			// Load current results
			await this.loadCurrentResults();

			// Load baseline for comparison
			await this.loadBaselineResults();

			// Detect regressions
			this.detectRegressions();

			// Generate reports
			this.generateReport();

			// Send alerts if needed
			await this.sendAlerts();

			// Determine CI status
			return this.getCIStatus();
		} catch (error) {
			console.error("❌ Performance check failed:", error);
			return { success: false, error: error.message };
		}
	}

	async loadCurrentResults() {
		// Load Lighthouse results
		const lighthousePath = join(projectRoot, ".lighthouseci/links.json");
		if (existsSync(lighthousePath)) {
			const links = JSON.parse(readFileSync(lighthousePath, "utf8"));
			if (links.length > 0) {
				const reportPath = links[0].jsonPath;
				if (existsSync(reportPath)) {
					const report = JSON.parse(readFileSync(reportPath, "utf8"));
					this.currentResults.lighthouse =
						this.extractLighthouseMetrics(report);
				}
			}
		}

		// Load bundle analysis results
		const bundlePath = join(projectRoot, "perf-data/bundles/latest.json");
		if (existsSync(bundlePath)) {
			const bundleData = JSON.parse(readFileSync(bundlePath, "utf8"));
			this.currentResults.bundle = this.extractBundleMetrics(bundleData);
		}

		console.log("📊 Current results loaded:", Object.keys(this.currentResults));
	}

	async loadBaselineResults() {
		const commitHash = this.getCurrentCommitHash();
		const baseCommit = this.getBaselineCommit();

		console.log(
			`📋 Comparing ${commitHash.slice(0, 7)} with baseline ${baseCommit.slice(0, 7)}`,
		);

		// Load historical data for baseline comparison
		const historyPath = join(
			projectRoot,
			"perf-data/lighthouse-reports/history.json",
		);
		if (existsSync(historyPath)) {
			const history = JSON.parse(readFileSync(historyPath, "utf8"));

			// Find baseline results (latest from main branch or last 7 days)
			const baseline = this.findBaseline(history, baseCommit);
			if (baseline) {
				this.baselineResults.lighthouse = baseline;
			}
		}

		// Load bundle history
		const bundleHistoryPath = join(
			projectRoot,
			"perf-data/bundles/history.json",
		);
		if (existsSync(bundleHistoryPath)) {
			const bundleHistory = JSON.parse(readFileSync(bundleHistoryPath, "utf8"));
			const bundleBaseline = this.findBaseline(bundleHistory, baseCommit);
			if (bundleBaseline) {
				this.baselineResults.bundle = bundleBaseline;
			}
		}

		console.log(
			"📊 Baseline results loaded:",
			Object.keys(this.baselineResults),
		);
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
			fcp: audits["first-contentful-paint"]?.numericValue || 0,
			tti: audits["interactive"]?.numericValue || 0,
			tbt: audits["total-blocking-time"]?.numericValue || 0,
		};
	}

	extractBundleMetrics(bundleData) {
		return {
			totalSize: bundleData.totals?.size || 0,
			gzipSize: bundleData.totals?.gzipSize || 0,
			jsSize: bundleData.totals?.byType?.javascript?.size || 0,
			cssSize: bundleData.totals?.byType?.stylesheet?.size || 0,
			staticDataSize: bundleData.staticData?.totalSize || 0,
			fileCount: bundleData.totals?.count || 0,
		};
	}

	detectRegressions() {
		this.regressions = [];

		// Check Lighthouse regressions
		if (this.currentResults.lighthouse && this.baselineResults.lighthouse) {
			this.checkLighthouseRegressions();
		}

		// Check bundle size regressions
		if (this.currentResults.bundle && this.baselineResults.bundle) {
			this.checkBundleRegressions();
		}

		console.log(`🔍 Detected ${this.regressions.length} potential regressions`);
	}

	checkLighthouseRegressions() {
		const current = this.currentResults.lighthouse;
		const baseline = this.baselineResults.lighthouse;
		const thresholds = this.config.thresholds;

		// Performance score regression
		const perfDiff = baseline.performance - current.performance;
		if (perfDiff > thresholds.performance.regression) {
			this.regressions.push({
				type: "performance",
				metric: "Performance Score",
				current: current.performance.toFixed(1),
				baseline: baseline.performance.toFixed(1),
				difference: `-${perfDiff.toFixed(1)}`,
				severity: "high",
				description: "Performance score has decreased significantly",
			});
		}

		// LCP regression
		const lcpDiff = current.lcp - baseline.lcp;
		if (lcpDiff > thresholds.lcp.regression) {
			this.regressions.push({
				type: "web-vitals",
				metric: "Largest Contentful Paint",
				current: `${current.lcp.toFixed(0)}ms`,
				baseline: `${baseline.lcp.toFixed(0)}ms`,
				difference: `+${lcpDiff.toFixed(0)}ms`,
				severity: current.lcp > thresholds.lcp.max ? "high" : "medium",
				description: "Largest Contentful Paint has increased",
			});
		}

		// CLS regression
		const clsDiff = current.cls - baseline.cls;
		if (clsDiff > thresholds.cls.regression) {
			this.regressions.push({
				type: "web-vitals",
				metric: "Cumulative Layout Shift",
				current: current.cls.toFixed(3),
				baseline: baseline.cls.toFixed(3),
				difference: `+${clsDiff.toFixed(3)}`,
				severity: current.cls > thresholds.cls.max ? "high" : "medium",
				description: "Cumulative Layout Shift has increased",
			});
		}

		// FID regression
		const fidDiff = current.fid - baseline.fid;
		if (fidDiff > thresholds.fid.regression) {
			this.regressions.push({
				type: "web-vitals",
				metric: "First Input Delay",
				current: `${current.fid.toFixed(0)}ms`,
				baseline: `${baseline.fid.toFixed(0)}ms`,
				difference: `+${fidDiff.toFixed(0)}ms`,
				severity: current.fid > thresholds.fid.max ? "high" : "medium",
				description: "First Input Delay has increased",
			});
		}
	}

	checkBundleRegressions() {
		const current = this.currentResults.bundle;
		const baseline = this.baselineResults.bundle;
		const threshold = this.config.thresholds.bundleSize;

		const sizeDiff = current.totalSize - baseline.totalSize;
		const regressionThreshold = baseline.totalSize * threshold.regression;

		if (sizeDiff > regressionThreshold) {
			this.regressions.push({
				type: "bundle-size",
				metric: "Total Bundle Size",
				current: this.formatBytes(current.totalSize),
				baseline: this.formatBytes(baseline.totalSize),
				difference: `+${this.formatBytes(sizeDiff)}`,
				severity: current.totalSize > threshold.max ? "high" : "medium",
				description: "Bundle size has increased significantly",
			});
		}

		// Check JavaScript size specifically
		const jsDiff = current.jsSize - baseline.jsSize;
		const jsRegressionThreshold = baseline.jsSize * threshold.regression;

		if (jsDiff > jsRegressionThreshold) {
			this.regressions.push({
				type: "bundle-size",
				metric: "JavaScript Bundle Size",
				current: this.formatBytes(current.jsSize),
				baseline: this.formatBytes(baseline.jsSize),
				difference: `+${this.formatBytes(jsDiff)}`,
				severity: "medium",
				description: "JavaScript bundle size has increased",
			});
		}
	}

	generateReport() {
		const report = {
			timestamp: new Date().toISOString(),
			commit: this.getCurrentCommitHash(),
			baselineCommit: this.getBaselineCommit(),
			summary: this.generateSummary(),
			regressions: this.regressions,
			currentMetrics: this.currentResults,
			baselineMetrics: this.baselineResults,
		};

		// Save detailed report
		const reportPath = join(projectRoot, "perf-data/performance-report.json");
		writeFileSync(reportPath, JSON.stringify(report, null, 2));

		// Generate PR comment if in PR context
		if (process.env.PR_NUMBER) {
			this.generatePRComment(report);
		}

		console.log("📋 Performance report generated");
		return report;
	}

	generateSummary() {
		const highRegressions = this.regressions.filter(
			(r) => r.severity === "high",
		).length;
		const mediumRegressions = this.regressions.filter(
			(r) => r.severity === "medium",
		).length;

		if (this.regressions.length === 0) {
			return {
				status: "passing",
				message: "✅ No performance regressions detected",
				score: 100,
			};
		}

		if (highRegressions > 0) {
			return {
				status: "failing",
				message: `❌ ${highRegressions} critical performance regression(s) detected`,
				score: Math.max(0, 100 - highRegressions * 30 - mediumRegressions * 10),
			};
		}

		return {
			status: "warning",
			message: `⚠️ ${mediumRegressions} performance regression(s) detected`,
			score: Math.max(50, 100 - mediumRegressions * 15),
		};
	}

	generatePRComment(report) {
		const { summary, regressions, currentMetrics } = report;
		const lighthouse = currentMetrics.lighthouse || {};
		const bundle = currentMetrics.bundle || {};

		let comment = `## 📊 Performance Report

${summary.message}

### 📈 Current Metrics
| Metric | Value | Status |
|--------|--------|--------|
| Performance Score | ${lighthouse.performance?.toFixed(1) || "N/A"} | ${this.getStatusIcon(lighthouse.performance, 90)} |
| Bundle Size | ${this.formatBytes(bundle.totalSize || 0)} | ${this.getStatusIcon(bundle.totalSize, 1024000, true)} |
| LCP | ${lighthouse.lcp?.toFixed(0) || "N/A"}ms | ${this.getStatusIcon(lighthouse.lcp, 2500, true)} |
| CLS | ${lighthouse.cls?.toFixed(3) || "N/A"} | ${this.getStatusIcon(lighthouse.cls, 0.1, true)} |
`;

		if (regressions.length > 0) {
			comment += `\n### ⚠️ Performance Regressions\n`;
			for (const regression of regressions) {
				const icon = regression.severity === "high" ? "🔴" : "🟡";
				comment += `\n${icon} **${regression.metric}**: ${regression.current} (was ${regression.baseline}, ${regression.difference})\n`;
				comment += `   ${regression.description}\n`;
			}
		}

		comment += `\n### 📊 Detailed Breakdown
- **Static Data**: ${this.formatBytes(436000)} (categories + search index)
- **JavaScript**: ${this.formatBytes(bundle.jsSize || 0)}
- **CSS**: ${this.formatBytes(bundle.cssSize || 0)}
- **Total Files**: ${bundle.fileCount || 0}

<details>
<summary>View Performance Budget Status</summary>

${this.generateBudgetTable()}

</details>

---
*Performance report generated at ${new Date().toLocaleString()}*`;

		// Save PR comment
		const commentPath = join(projectRoot, "perf-data/pr-comment.md");
		writeFileSync(commentPath, comment);
	}

	generateBudgetTable() {
		const lighthouse = this.currentResults.lighthouse || {};
		const bundle = this.currentResults.bundle || {};
		const thresholds = this.config.thresholds;

		return `| Budget | Current | Limit | Status |
|--------|---------|-------|--------|
| Performance Score | ${lighthouse.performance?.toFixed(1) || "N/A"} | ${thresholds.performance.min} | ${lighthouse.performance >= thresholds.performance.min ? "✅" : "❌"} |
| Bundle Size | ${this.formatBytes(bundle.totalSize || 0)} | ${this.formatBytes(thresholds.bundleSize.max)} | ${bundle.totalSize <= thresholds.bundleSize.max ? "✅" : "❌"} |
| LCP | ${lighthouse.lcp?.toFixed(0) || "N/A"}ms | ${thresholds.lcp.max}ms | ${lighthouse.lcp <= thresholds.lcp.max ? "✅" : "❌"} |
| CLS | ${lighthouse.cls?.toFixed(3) || "N/A"} | ${thresholds.cls.max} | ${lighthouse.cls <= thresholds.cls.max ? "✅" : "❌"} |
| FID | ${lighthouse.fid?.toFixed(0) || "N/A"}ms | ${thresholds.fid.max}ms | ${lighthouse.fid <= thresholds.fid.max ? "✅" : "❌"} |`;
	}

	async sendAlerts() {
		if (this.regressions.length === 0) return;

		const highRegressions = this.regressions.filter(
			(r) => r.severity === "high",
		);
		if (highRegressions.length === 0) return;

		console.log("🚨 Sending performance regression alerts...");

		// Send Slack notification
		if (this.config.alerts.slackWebhook) {
			await this.sendSlackAlert(highRegressions);
		}

		// Log for CI visibility
		console.log("⚠️ Critical performance regressions detected:");
		for (const regression of highRegressions) {
			console.log(
				`   ${regression.metric}: ${regression.current} (${regression.difference})`,
			);
		}
	}

	async sendSlackAlert(regressions) {
		try {
			const { default: fetch } = await import("node-fetch");

			const message = {
				text: "🚨 Performance Regression Alert",
				blocks: [
					{
						type: "header",
						text: {
							type: "plain_text",
							text: "🚨 Performance Regression Detected",
						},
					},
					{
						type: "context",
						elements: [
							{
								type: "mrkdwn",
								text: `Repository: ${process.env.GITHUB_REPOSITORY || "CCL Test Viewer"}\nCommit: ${this.getCurrentCommitHash().slice(0, 7)}`,
							},
						],
					},
					{
						type: "section",
						fields: regressions.map((r) => ({
							type: "mrkdwn",
							text: `*${r.metric}*\n${r.current} (${r.difference})`,
						})),
					},
				],
			};

			await fetch(this.config.alerts.slackWebhook, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(message),
			});

			console.log("📱 Slack alert sent");
		} catch (error) {
			console.warn("Failed to send Slack alert:", error.message);
		}
	}

	getCIStatus() {
		const summary = this.generateSummary();
		const shouldFail = this.regressions.some((r) => r.severity === "high");

		return {
			success: !shouldFail,
			score: summary.score,
			message: summary.message,
			regressions: this.regressions.length,
			details: this.regressions,
		};
	}

	// Utility methods
	getCurrentCommitHash() {
		try {
			return execSync("git rev-parse HEAD", {
				encoding: "utf8",
				cwd: projectRoot,
			}).trim();
		} catch {
			return "unknown";
		}
	}

	getBaselineCommit() {
		try {
			// Try to get the merge base with main
			return execSync("git merge-base HEAD origin/main", {
				encoding: "utf8",
				cwd: projectRoot,
			}).trim();
		} catch {
			// Fallback to previous commit
			try {
				return execSync("git rev-parse HEAD~1", {
					encoding: "utf8",
					cwd: projectRoot,
				}).trim();
			} catch {
				return "unknown";
			}
		}
	}

	findBaseline(history, targetCommit) {
		// Find the most recent entry for the target commit
		const exact = history.find((entry) => entry.commit === targetCommit);
		if (exact) return exact;

		// Fallback to most recent entry from last 7 days
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

		const recent = history
			.filter((entry) => new Date(entry.timestamp) >= sevenDaysAgo)
			.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

		return recent[0] || null;
	}

	formatBytes(bytes) {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
	}

	getStatusIcon(value, threshold, inverse = false) {
		if (!value) return "❓";

		const isGood = inverse ? value <= threshold : value >= threshold;
		return isGood ? "✅" : "❌";
	}
}

// CLI execution
async function main() {
	const args = process.argv.slice(2);
	const checkRegression = args.includes("--check-regression");

	try {
		const ci = new PerformanceCI();
		const result = await ci.runPerformanceCheck();

		console.log("\n📊 Performance Check Results:");
		console.log(`Status: ${result.success ? "✅ PASS" : "❌ FAIL"}`);
		console.log(`Score: ${result.score}/100`);
		console.log(`Message: ${result.message}`);

		if (result.regressions > 0) {
			console.log(`Regressions: ${result.regressions}`);
		}

		// Exit with error code if there are critical regressions
		if (!result.success && checkRegression) {
			process.exit(1);
		}
	} catch (error) {
		console.error("❌ Performance check failed:", error.message);
		process.exit(1);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}

export default PerformanceCI;
