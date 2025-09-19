#!/usr/bin/env node

import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../..");

class ReportGenerator {
	constructor() {
		this.outputDir = join(projectRoot, "perf-data/reports");
		this.ensureDirectories();
	}

	ensureDirectories() {
		if (!existsSync(this.outputDir)) {
			mkdirSync(this.outputDir, { recursive: true });
		}
	}

	async generateReport(options = {}) {
		const { type = "standard", timeRange = 30, format = "json" } = options;

		console.log(`📊 Generating ${type} performance report...`);

		try {
			const data = await this.collectData(timeRange);
			const report = this.buildReport(data, type);

			const filename = this.saveReport(report, type, format);

			if (options.pr) {
				this.generatePRReport(report, options.pr);
			}

			console.log(`✅ Report generated: ${filename}`);
			return report;
		} catch (error) {
			console.error("❌ Report generation failed:", error.message);
			throw error;
		}
	}

	async collectData(timeRange) {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - timeRange);

		const data = {
			lighthouse: [],
			bundles: [],
			commits: [],
			timeRange,
			collectedAt: new Date().toISOString(),
		};

		// Collect Lighthouse data
		const lighthouseHistoryPath = join(
			projectRoot,
			"perf-data/lighthouse-reports/history.json",
		);
		if (existsSync(lighthouseHistoryPath)) {
			const history = JSON.parse(readFileSync(lighthouseHistoryPath, "utf8"));
			data.lighthouse = history
				.filter((entry) => new Date(entry.timestamp) >= cutoffDate)
				.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
		}

		// Collect bundle data
		const bundleHistoryPath = join(
			projectRoot,
			"perf-data/bundles/history.json",
		);
		if (existsSync(bundleHistoryPath)) {
			const history = JSON.parse(readFileSync(bundleHistoryPath, "utf8"));
			data.bundles = history
				.filter((entry) => new Date(entry.timestamp) >= cutoffDate)
				.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
		}

		// Collect git commit data
		try {
			const commits = execSync(
				`git log --since="${cutoffDate.toISOString()}" --pretty=format:"%H|%s|%an|%ad" --date=iso`,
				{ encoding: "utf8", cwd: projectRoot },
			);

			data.commits = commits
				.split("\n")
				.filter((line) => line.trim())
				.map((line) => {
					const [hash, subject, author, date] = line.split("|");
					return { hash, subject, author, date };
				});
		} catch (e) {
			console.warn("Could not collect git commit data");
		}

		return data;
	}

	buildReport(data, type) {
		const report = {
			type,
			timestamp: new Date().toISOString(),
			summary: this.generateSummary(data),
			trends: this.analyzeTrends(data),
			performance: this.analyzePerformance(data),
			bundleAnalysis: this.analyzeBundleSize(data),
			recommendations: this.generateRecommendations(data),
			rawData: type === "detailed" ? data : undefined,
		};

		return report;
	}

	generateSummary(data) {
		const latest = {
			lighthouse: data.lighthouse[data.lighthouse.length - 1] || {},
			bundle: data.bundles[data.bundles.length - 1] || {},
		};

		const earliest = {
			lighthouse: data.lighthouse[0] || {},
			bundle: data.bundles[0] || {},
		};

		return {
			dataPoints: {
				lighthouse: data.lighthouse.length,
				bundles: data.bundles.length,
				commits: data.commits.length,
			},
			currentMetrics: {
				performanceScore: latest.lighthouse.performance || 0,
				bundleSize: latest.bundle.totals?.size || 0,
				lcp: latest.lighthouse.lcp || 0,
				cls: latest.lighthouse.cls || 0,
				staticDataSize: 436000, // Known static data size
			},
			trends: {
				performanceChange: this.calculateChange(
					earliest.lighthouse.performance,
					latest.lighthouse.performance,
				),
				bundleSizeChange: this.calculateChange(
					earliest.bundle.totals?.size,
					latest.bundle.totals?.size,
				),
				lcpChange: this.calculateChange(
					earliest.lighthouse.lcp,
					latest.lighthouse.lcp,
					true, // inverse (lower is better)
				),
			},
		};
	}

	analyzeTrends(data) {
		return {
			performance: this.calculateTrend(data.lighthouse, "performance"),
			bundleSize: this.calculateTrend(
				data.bundles,
				(entry) => entry.totals?.size,
			),
			lcp: this.calculateTrend(data.lighthouse, "lcp"),
			cls: this.calculateTrend(data.lighthouse, "cls"),
			buildFrequency: this.calculateBuildFrequency(data.commits),
		};
	}

	analyzePerformance(data) {
		const lighthouse = data.lighthouse;
		if (lighthouse.length === 0) return null;

		const metrics = [
			"performance",
			"accessibility",
			"bestPractices",
			"seo",
			"lcp",
			"cls",
			"fid",
		];
		const analysis = {};

		for (const metric of metrics) {
			const values = lighthouse
				.map((entry) => entry[metric])
				.filter((v) => v !== undefined);
			if (values.length > 0) {
				analysis[metric] = {
					current: values[values.length - 1],
					average: values.reduce((a, b) => a + b, 0) / values.length,
					min: Math.min(...values),
					max: Math.max(...values),
					trend: this.calculateLinearTrend(values),
				};
			}
		}

		return analysis;
	}

	analyzeBundleSize(data) {
		const bundles = data.bundles;
		if (bundles.length === 0) return null;

		const latest = bundles[bundles.length - 1];
		const sizes = bundles
			.map((b) => b.totals?.size)
			.filter((s) => s !== undefined);

		return {
			current: {
				total: latest.totals?.size || 0,
				gzipped: latest.totals?.gzipSize || 0,
				byType: latest.totals?.byType || {},
				staticData: latest.staticData?.totalSize || 0,
			},
			trends: {
				size: this.calculateLinearTrend(sizes),
				growth: sizes.length > 1 ? sizes[sizes.length - 1] - sizes[0] : 0,
			},
			breakdown: this.analyzeBundleBreakdown(bundles),
			compressionRatio:
				latest.totals?.gzipSize && latest.totals?.size
					? ((latest.totals.gzipSize / latest.totals.size) * 100).toFixed(1)
					: null,
		};
	}

	analyzeBundleBreakdown(bundles) {
		const latest = bundles[bundles.length - 1];
		if (!latest?.totals?.byType) return null;

		const breakdown = {};
		const total = latest.totals.size;

		for (const [type, data] of Object.entries(latest.totals.byType)) {
			breakdown[type] = {
				size: data.size || 0,
				percentage: total ? ((data.size / total) * 100).toFixed(1) : 0,
				gzipSize: data.gzipSize || 0,
			};
		}

		return breakdown;
	}

	generateRecommendations(data) {
		const recommendations = [];
		const latest = {
			lighthouse: data.lighthouse[data.lighthouse.length - 1] || {},
			bundle: data.bundles[data.bundles.length - 1] || {},
		};

		// Performance recommendations
		if (latest.lighthouse.performance < 90) {
			recommendations.push({
				type: "performance",
				priority: "high",
				title: "Improve Performance Score",
				description: `Current score: ${latest.lighthouse.performance?.toFixed(1)}. Target: 90+`,
				suggestions: [
					"Optimize Core Web Vitals (LCP, CLS, FID)",
					"Reduce JavaScript execution time",
					"Implement resource preloading",
					"Optimize images and assets",
				],
			});
		}

		// Bundle size recommendations
		const bundleSize = latest.bundle.totals?.size || 0;
		if (bundleSize > 1024000) {
			// 1MB
			recommendations.push({
				type: "bundle-size",
				priority: "medium",
				title: "Reduce Bundle Size",
				description: `Current size: ${this.formatBytes(bundleSize)}. Consider optimization.`,
				suggestions: [
					"Implement code splitting for routes",
					"Tree shake unused dependencies",
					"Lazy load non-critical components",
					"Optimize static data loading",
				],
			});
		}

		// Static data recommendations
		recommendations.push({
			type: "static-data",
			priority: "medium",
			title: "Optimize Static Data Loading",
			description:
				"436KB of test data could be optimized for better initial load performance.",
			suggestions: [
				"Implement progressive data loading",
				"Use pagination for large test sets",
				"Compress JSON data with better algorithms",
				"Consider splitting categories and search index",
			],
		});

		// LCP recommendations
		if (latest.lighthouse.lcp > 2500) {
			recommendations.push({
				type: "web-vitals",
				priority: "high",
				title: "Improve Largest Contentful Paint",
				description: `Current LCP: ${latest.lighthouse.lcp?.toFixed(0)}ms. Target: <2500ms`,
				suggestions: [
					"Optimize critical resource loading",
					"Preload important assets",
					"Reduce server response times",
					"Optimize image sizes and formats",
				],
			});
		}

		return recommendations;
	}

	saveReport(report, type, format) {
		const timestamp = new Date().toISOString().split("T")[0];
		const filename = `performance-report-${type}-${timestamp}.${format}`;
		const filepath = join(this.outputDir, filename);

		if (format === "json") {
			writeFileSync(filepath, JSON.stringify(report, null, 2));
		} else if (format === "md") {
			writeFileSync(filepath, this.formatAsMarkdown(report));
		}

		// Also save as latest
		const latestPath = join(this.outputDir, `latest-${type}.${format}`);
		if (format === "json") {
			writeFileSync(latestPath, JSON.stringify(report, null, 2));
		} else {
			writeFileSync(latestPath, this.formatAsMarkdown(report));
		}

		return filename;
	}

	generatePRReport(report, prNumber) {
		const markdown = this.formatPRComment(report);
		const filename = join(projectRoot, "perf-data/pr-comment.md");
		writeFileSync(filename, markdown);
		console.log(`📝 PR comment generated for PR #${prNumber}`);
	}

	formatPRComment(report) {
		const { summary, performance, bundleAnalysis, recommendations } = report;

		let comment = `## 📊 Performance Report

### 📈 Current Metrics
| Metric | Value | Trend |
|--------|--------|-------|
| Performance Score | ${summary.currentMetrics.performanceScore.toFixed(1)} | ${this.formatTrend(summary.trends.performanceChange)} |
| Bundle Size | ${this.formatBytes(summary.currentMetrics.bundleSize)} | ${this.formatTrend(summary.trends.bundleSizeChange)} |
| LCP | ${summary.currentMetrics.lcp.toFixed(0)}ms | ${this.formatTrend(summary.trends.lcpChange)} |
| CLS | ${summary.currentMetrics.cls.toFixed(3)} | - |

### 📦 Bundle Analysis
`;

		if (bundleAnalysis?.breakdown) {
			comment += `| Type | Size | Percentage |\n|------|------|------------|\n`;
			for (const [type, data] of Object.entries(bundleAnalysis.breakdown)) {
				comment += `| ${type} | ${this.formatBytes(data.size)} | ${data.percentage}% |\n`;
			}
		}

		if (recommendations.length > 0) {
			comment += `\n### 💡 Recommendations\n`;
			const highPriority = recommendations.filter((r) => r.priority === "high");
			if (highPriority.length > 0) {
				comment += `\n#### High Priority\n`;
				for (const rec of highPriority) {
					comment += `- **${rec.title}**: ${rec.description}\n`;
				}
			}

			const mediumPriority = recommendations.filter(
				(r) => r.priority === "medium",
			);
			if (mediumPriority.length > 0) {
				comment += `\n#### Medium Priority\n`;
				for (const rec of mediumPriority) {
					comment += `- **${rec.title}**: ${rec.description}\n`;
				}
			}
		}

		comment += `\n---\n*Report generated at ${new Date().toLocaleString()}*`;
		return comment;
	}

	formatAsMarkdown(report) {
		const { summary, trends, performance, bundleAnalysis, recommendations } =
			report;

		return `# Performance Report

Generated: ${report.timestamp}

## Summary

### Current Metrics
- **Performance Score**: ${summary.currentMetrics.performanceScore.toFixed(1)}
- **Bundle Size**: ${this.formatBytes(summary.currentMetrics.bundleSize)}
- **LCP**: ${summary.currentMetrics.lcp.toFixed(0)}ms
- **CLS**: ${summary.currentMetrics.cls.toFixed(3)}
- **Static Data**: ${this.formatBytes(summary.currentMetrics.staticDataSize)}

### Trends
- **Performance**: ${this.formatTrend(summary.trends.performanceChange)}
- **Bundle Size**: ${this.formatTrend(summary.trends.bundleSizeChange)}
- **LCP**: ${this.formatTrend(summary.trends.lcpChange)}

## Detailed Analysis

### Performance Metrics
${
	performance
		? Object.entries(performance)
				.map(
					([metric, data]) =>
						`- **${metric}**: Current: ${data.current.toFixed(2)}, Average: ${data.average.toFixed(2)}, Trend: ${data.trend > 0 ? "📈" : data.trend < 0 ? "📉" : "➡️"}`,
				)
				.join("\n")
		: "No performance data available"
}

### Bundle Analysis
${
	bundleAnalysis
		? `
- **Total Size**: ${this.formatBytes(bundleAnalysis.current.total)}
- **Gzipped**: ${this.formatBytes(bundleAnalysis.current.gzipped)}
- **Compression Ratio**: ${bundleAnalysis.compressionRatio}%
- **Static Data**: ${this.formatBytes(bundleAnalysis.current.staticData)}

#### Breakdown by Type
${Object.entries(bundleAnalysis.breakdown || {})
	.map(
		([type, data]) =>
			`- **${type}**: ${this.formatBytes(data.size)} (${data.percentage}%)`,
	)
	.join("\n")}
`
		: "No bundle analysis available"
}

## Recommendations

${recommendations
	.map(
		(rec) => `
### ${rec.title} (${rec.priority} priority)
${rec.description}

${rec.suggestions.map((s) => `- ${s}`).join("\n")}
`,
	)
	.join("\n")}

## Data Points
- Lighthouse entries: ${summary.dataPoints.lighthouse}
- Bundle entries: ${summary.dataPoints.bundles}
- Commits analyzed: ${summary.dataPoints.commits}
`;
	}

	// Utility methods
	calculateChange(oldValue, newValue, inverse = false) {
		if (!oldValue || !newValue) return 0;
		const change = ((newValue - oldValue) / oldValue) * 100;
		return inverse ? -change : change;
	}

	calculateTrend(data, accessor) {
		if (data.length < 2) return 0;

		const values = data
			.map((entry) =>
				typeof accessor === "function" ? accessor(entry) : entry[accessor],
			)
			.filter((v) => v !== undefined);

		return this.calculateLinearTrend(values);
	}

	calculateLinearTrend(values) {
		if (values.length < 2) return 0;

		const n = values.length;
		const x = Array.from({ length: n }, (_, i) => i);
		const y = values;

		const sumX = x.reduce((a, b) => a + b, 0);
		const sumY = y.reduce((a, b) => a + b, 0);
		const sumXY = x.map((xi, i) => xi * y[i]).reduce((a, b) => a + b, 0);
		const sumXX = x.map((xi) => xi * xi).reduce((a, b) => a + b, 0);

		const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
		return slope;
	}

	calculateBuildFrequency(commits) {
		if (commits.length === 0) return 0;

		const dates = commits.map((c) => new Date(c.date).getTime());
		const range = Math.max(...dates) - Math.min(...dates);
		const days = range / (1000 * 60 * 60 * 24);

		return days > 0 ? commits.length / days : 0;
	}

	formatBytes(bytes) {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
	}

	formatTrend(change) {
		if (Math.abs(change) < 1) return "➡️ stable";
		return change > 0
			? `📈 +${change.toFixed(1)}%`
			: `📉 ${change.toFixed(1)}%`;
	}
}

// CLI execution
async function main() {
	const args = process.argv.slice(2);

	const options = {
		type: "standard",
		timeRange: 30,
		format: "json",
	};

	// Parse command line arguments
	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case "--weekly":
				options.type = "weekly";
				options.timeRange = 7;
				break;
			case "--detailed":
				options.type = "detailed";
				break;
			case "--pr":
				options.pr = args[i + 1];
				i++;
				break;
			case "--format":
				options.format = args[i + 1];
				i++;
				break;
			case "--timerange":
				options.timeRange = parseInt(args[i + 1]) || 30;
				i++;
				break;
		}
	}

	try {
		const generator = new ReportGenerator();
		await generator.generateReport(options);
	} catch (error) {
		console.error("❌ Report generation failed:", error.message);
		process.exit(1);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}

export default ReportGenerator;
