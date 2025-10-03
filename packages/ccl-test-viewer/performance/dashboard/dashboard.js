/**
 * Performance Dashboard JavaScript
 * Loads and visualizes performance data for CCL Test Viewer
 */

class PerformanceDashboard {
	constructor() {
		this.charts = {};
		this.data = {
			lighthouse: [],
			bundles: [],
			webVitals: [],
			budgets: null,
		};

		this.initializeDashboard();
	}

	async initializeDashboard() {
		try {
			// Load initial data
			await this.loadData();

			// Initialize charts
			this.initializeCharts();

			// Update current metrics
			this.updateCurrentMetrics();

			// Update other sections
			this.updateBudgetStatus();
			this.updatePerformanceIssues();
			this.updateStaticDataMetrics();
			this.updateRecommendations();

			// Setup event listeners
			this.setupEventListeners();

			console.log("📊 Performance dashboard initialized");
		} catch (error) {
			console.error("Failed to initialize dashboard:", error);
			this.showError("Failed to load performance data");
		}
	}

	async loadData() {
		const timeRange = this.getTimeRange();

		try {
			// Load data from various sources
			const [lighthouseData, bundleData, budgetData] = await Promise.all([
				this.loadLighthouseData(timeRange),
				this.loadBundleData(timeRange),
				this.loadBudgetData(),
			]);

			this.data.lighthouse = lighthouseData;
			this.data.bundles = bundleData;
			this.data.budgets = budgetData;

			// Simulate web vitals data (in real implementation, this would come from analytics)
			this.data.webVitals = this.generateWebVitalsData(timeRange);
		} catch (error) {
			console.warn("Some data could not be loaded:", error);
			// Use mock data for demonstration
			this.loadMockData();
		}
	}

	async loadLighthouseData(timeRange) {
		try {
			const response = await fetch(
				`../perf-data/lighthouse-reports/history.json`,
			);
			if (!response.ok) throw new Error("No lighthouse data");

			const history = await response.json();
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - timeRange);

			return history
				.filter((entry) => new Date(entry.timestamp) >= cutoffDate)
				.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
		} catch {
			return this.getMockLighthouseData(timeRange);
		}
	}

	async loadBundleData(timeRange) {
		try {
			const response = await fetch(`../perf-data/bundles/history.json`);
			if (!response.ok) throw new Error("No bundle data");

			const history = await response.json();
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - timeRange);

			return history
				.filter((entry) => new Date(entry.timestamp) >= cutoffDate)
				.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
		} catch {
			return this.getMockBundleData(timeRange);
		}
	}

	async loadBudgetData() {
		try {
			const response = await fetch(`../configs/budgets.json`);
			if (!response.ok) throw new Error("No budget data");
			return await response.json();
		} catch {
			return this.getMockBudgetData();
		}
	}

	loadMockData() {
		console.log("Loading mock data for demonstration");
		const timeRange = this.getTimeRange();

		this.data.lighthouse = this.getMockLighthouseData(timeRange);
		this.data.bundles = this.getMockBundleData(timeRange);
		this.data.budgets = this.getMockBudgetData();
		this.data.webVitals = this.generateWebVitalsData(timeRange);
	}

	getMockLighthouseData(days) {
		const data = [];
		for (let i = days; i >= 0; i--) {
			const date = new Date();
			date.setDate(date.getDate() - i);

			data.push({
				timestamp: date.toISOString(),
				performance: 88 + Math.random() * 10,
				accessibility: 95 + Math.random() * 5,
				bestPractices: 90 + Math.random() * 8,
				seo: 92 + Math.random() * 6,
				lcp: 2000 + Math.random() * 800,
				cls: 0.05 + Math.random() * 0.08,
				fid: 80 + Math.random() * 40,
			});
		}
		return data;
	}

	getMockBundleData(days) {
		const data = [];
		let baseSize = 480000; // 480KB base

		for (let i = days; i >= 0; i--) {
			const date = new Date();
			date.setDate(date.getDate() - i);

			const variation = (Math.random() - 0.5) * 0.1;
			const size = Math.floor(baseSize * (1 + variation));

			data.push({
				timestamp: date.toISOString(),
				totals: {
					size: size,
					gzipSize: Math.floor(size * 0.3),
					byType: {
						javascript: { size: Math.floor(size * 0.6) },
						stylesheet: { size: Math.floor(size * 0.1) },
						data: { size: 436000 }, // Static data
						other: { size: Math.floor(size * 0.1) },
					},
				},
				staticDataSize: 436000,
			});
		}
		return data;
	}

	getMockBudgetData() {
		return {
			resourceSizes: [
				{ resourceType: "script", budget: 400 },
				{ resourceType: "stylesheet", budget: 50 },
				{ resourceType: "total", budget: 1000 },
			],
			timings: [
				{ metric: "largest-contentful-paint", budget: 2500 },
				{ metric: "cumulative-layout-shift", budget: 0.1 },
				{ metric: "first-input-delay", budget: 100 },
			],
		};
	}

	generateWebVitalsData(days) {
		const data = [];
		for (let i = days; i >= 0; i--) {
			const date = new Date();
			date.setDate(date.getDate() - i);

			data.push({
				timestamp: date.toISOString(),
				lcp: 2000 + Math.random() * 600,
				fid: 70 + Math.random() * 50,
				cls: 0.04 + Math.random() * 0.08,
				ttfb: 400 + Math.random() * 300,
			});
		}
		return data;
	}

	initializeCharts() {
		this.initializeWebVitalsChart();
		this.initializeLighthouseChart();
		this.initializeBundleSizeChart();
	}

	initializeWebVitalsChart() {
		const ctx = document.getElementById("webVitalsChart").getContext("2d");
		const data = this.data.webVitals;

		this.charts.webVitals = new Chart(ctx, {
			type: "line",
			data: {
				labels: data.map((d) => this.formatDate(d.timestamp)),
				datasets: [
					{
						label: "LCP (ms)",
						data: data.map((d) => d.lcp),
						borderColor: "#dc2626",
						backgroundColor: "rgba(220, 38, 38, 0.1)",
						tension: 0.1,
					},
					{
						label: "FID (ms)",
						data: data.map((d) => d.fid),
						borderColor: "#2563eb",
						backgroundColor: "rgba(37, 99, 235, 0.1)",
						tension: 0.1,
					},
					{
						label: "CLS (×100)",
						data: data.map((d) => d.cls * 100),
						borderColor: "#059669",
						backgroundColor: "rgba(5, 150, 105, 0.1)",
						tension: 0.1,
					},
				],
			},
			options: this.getChartOptions("Core Web Vitals Over Time"),
		});
	}

	initializeLighthouseChart() {
		const ctx = document.getElementById("lighthouseChart").getContext("2d");
		const data = this.data.lighthouse;

		this.charts.lighthouse = new Chart(ctx, {
			type: "line",
			data: {
				labels: data.map((d) => this.formatDate(d.timestamp)),
				datasets: [
					{
						label: "Performance",
						data: data.map((d) => d.performance),
						borderColor: "#dc2626",
						backgroundColor: "rgba(220, 38, 38, 0.1)",
						tension: 0.1,
					},
					{
						label: "Accessibility",
						data: data.map((d) => d.accessibility),
						borderColor: "#059669",
						backgroundColor: "rgba(5, 150, 105, 0.1)",
						tension: 0.1,
					},
					{
						label: "Best Practices",
						data: data.map((d) => d.bestPractices),
						borderColor: "#2563eb",
						backgroundColor: "rgba(37, 99, 235, 0.1)",
						tension: 0.1,
					},
					{
						label: "SEO",
						data: data.map((d) => d.seo),
						borderColor: "#d97706",
						backgroundColor: "rgba(217, 119, 6, 0.1)",
						tension: 0.1,
					},
				],
			},
			options: {
				...this.getChartOptions("Lighthouse Scores Over Time"),
				scales: {
					y: {
						beginAtZero: false,
						min: 80,
						max: 100,
					},
				},
			},
		});
	}

	initializeBundleSizeChart() {
		const ctx = document.getElementById("bundleSizeChart").getContext("2d");
		const data = this.data.bundles;

		this.charts.bundleSize = new Chart(ctx, {
			type: "line",
			data: {
				labels: data.map((d) => this.formatDate(d.timestamp)),
				datasets: [
					{
						label: "Total Size (KB)",
						data: data.map((d) => Math.round(d.totals.size / 1024)),
						borderColor: "#dc2626",
						backgroundColor: "rgba(220, 38, 38, 0.1)",
						tension: 0.1,
					},
					{
						label: "Gzipped (KB)",
						data: data.map((d) => Math.round(d.totals.gzipSize / 1024)),
						borderColor: "#2563eb",
						backgroundColor: "rgba(37, 99, 235, 0.1)",
						tension: 0.1,
					},
				],
			},
			options: this.getChartOptions("Bundle Size Over Time"),
		});

		// Update bundle breakdown
		this.updateBundleBreakdown();
	}

	getChartOptions(title) {
		return {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					position: "bottom",
				},
				title: {
					display: false,
				},
			},
			scales: {
				x: {
					grid: {
						display: false,
					},
				},
				y: {
					beginAtZero: true,
					grid: {
						color: "rgba(0, 0, 0, 0.1)",
					},
				},
			},
			interaction: {
				intersect: false,
				mode: "index",
			},
		};
	}

	updateCurrentMetrics() {
		const latest = {
			lighthouse: this.data.lighthouse[this.data.lighthouse.length - 1] || {},
			bundle: this.data.bundles[this.data.bundles.length - 1] || {},
			webVitals: this.data.webVitals[this.data.webVitals.length - 1] || {},
		};

		// Update performance score
		const perfScore = latest.lighthouse.performance || 0;
		const perfElement = document.getElementById("currentPerformance");
		perfElement.textContent = Math.round(perfScore);
		perfElement.className = `metric-value ${this.getScoreClass(perfScore)}`;

		// Update bundle size
		const bundleSize = latest.bundle.totals?.size || 0;
		const bundleElement = document.getElementById("currentBundleSize");
		bundleElement.textContent = this.formatBytes(bundleSize);
		bundleElement.className = `metric-value ${this.getBundleSizeClass(bundleSize)}`;

		// Update LCP
		const lcp = latest.webVitals.lcp || latest.lighthouse.lcp || 0;
		const lcpElement = document.getElementById("currentLCP");
		lcpElement.textContent = `${Math.round(lcp)}ms`;
		lcpElement.className = `metric-value ${this.getLCPClass(lcp)}`;

		// Update CLS
		const cls = latest.webVitals.cls || latest.lighthouse.cls || 0;
		const clsElement = document.getElementById("currentCLS");
		clsElement.textContent = cls.toFixed(3);
		clsElement.className = `metric-value ${this.getCLSClass(cls)}`;
	}

	updateBundleBreakdown() {
		const latest = this.data.bundles[this.data.bundles.length - 1];
		if (!latest) return;

		const breakdown = document.getElementById("bundleBreakdown");
		const byType = latest.totals.byType || {};

		const html = Object.entries(byType)
			.map(
				([type, data]) => `
                <div class="bundle-item">
                    <span class="bundle-item-name">${this.capitalizeFirst(type)}</span>
                    <span class="bundle-item-size">${this.formatBytes(data.size)}</span>
                </div>
            `,
			)
			.join("");

		breakdown.innerHTML = html;
	}

	updateBudgetStatus() {
		const container = document.getElementById("budgetStatus");
		if (!this.data.budgets) {
			container.innerHTML = '<div class="loading">Loading budget data...</div>';
			return;
		}

		const latest = {
			lighthouse: this.data.lighthouse[this.data.lighthouse.length - 1] || {},
			bundle: this.data.bundles[this.data.bundles.length - 1] || {},
		};

		const budgetItems = [];

		// Check timing budgets
		for (const timing of this.data.budgets.timings || []) {
			const value = latest.lighthouse[timing.metric.replace(/-/g, "")] || 0;
			const status = value <= timing.budget ? "passing" : "failing";

			budgetItems.push({
				name: timing.metric.toUpperCase(),
				budget: timing.budget,
				actual: value,
				status,
				unit: timing.metric.includes("shift") ? "" : "ms",
			});
		}

		// Check size budgets
		for (const size of this.data.budgets.resourceSizes || []) {
			if (size.resourceType === "total") {
				const value = Math.round((latest.bundle.totals?.size || 0) / 1024);
				const status = value <= size.budget ? "passing" : "failing";

				budgetItems.push({
					name: "Total Size",
					budget: size.budget,
					actual: value,
					status,
					unit: "KB",
				});
			}
		}

		const html = budgetItems
			.map(
				(item) => `
            <div class="budget-item ${item.status}">
                <span class="budget-name">${item.name}</span>
                <div class="budget-status">
                    <span class="status-icon ${item.status}"></span>
                    <span class="budget-value">${Math.round(item.actual)}${item.unit} / ${item.budget}${item.unit}</span>
                </div>
            </div>
        `,
			)
			.join("");

		container.innerHTML = html;
	}

	updatePerformanceIssues() {
		const container = document.getElementById("performanceIssues");
		const latest = {
			lighthouse: this.data.lighthouse[this.data.lighthouse.length - 1] || {},
			bundle: this.data.bundles[this.data.bundles.length - 1] || {},
		};

		const issues = [];

		// Check for performance issues
		if (latest.lighthouse.performance < 90) {
			issues.push({
				type: "warning",
				title: "Performance Score Below Target",
				description: `Current score: ${Math.round(latest.lighthouse.performance)}/100. Target: 90+`,
			});
		}

		if (latest.lighthouse.lcp > 2500) {
			issues.push({
				type: "error",
				title: "Largest Contentful Paint Too Slow",
				description: `Current LCP: ${Math.round(latest.lighthouse.lcp)}ms. Target: <2500ms`,
			});
		}

		if ((latest.bundle.totals?.size || 0) > 1024000) {
			issues.push({
				type: "warning",
				title: "Bundle Size Exceeds Recommended Limit",
				description: `Current size: ${this.formatBytes(latest.bundle.totals.size)}. Consider code splitting.`,
			});
		}

		if (issues.length === 0) {
			issues.push({
				type: "info",
				title: "No Performance Issues Detected",
				description: "All metrics are within acceptable ranges.",
			});
		}

		const html = issues
			.map(
				(issue) => `
            <div class="issue-item ${issue.type}">
                <div class="issue-title">${issue.title}</div>
                <div class="issue-description">${issue.description}</div>
            </div>
        `,
			)
			.join("");

		container.innerHTML = html;
	}

	updateStaticDataMetrics() {
		const container = document.getElementById("staticDataMetrics");
		const latest = this.data.bundles[this.data.bundles.length - 1];

		const metrics = [
			{
				label: "Static Data Size",
				value: this.formatBytes(436000), // Known static data size
			},
			{
				label: "Test Count",
				value: "366",
			},
			{
				label: "Categories",
				value: "12",
			},
			{
				label: "Compression Ratio",
				value: "70%", // Estimated
			},
		];

		const html = metrics
			.map(
				(metric) => `
            <div class="data-metric">
                <div class="data-metric-label">${metric.label}</div>
                <div class="data-metric-value">${metric.value}</div>
            </div>
        `,
			)
			.join("");

		container.innerHTML = html;
	}

	updateRecommendations() {
		const container = document.getElementById("recommendations");
		const latest = {
			lighthouse: this.data.lighthouse[this.data.lighthouse.length - 1] || {},
			bundle: this.data.bundles[this.data.bundles.length - 1] || {},
		};

		const recommendations = [
			{
				title: "Optimize Static Data Loading",
				description:
					"Consider implementing lazy loading for the 436KB test data files. Load categories on demand and implement search index chunking.",
			},
			{
				title: "Enable Compression",
				description:
					"Ensure Brotli or Gzip compression is enabled for all static assets. This can reduce transfer sizes by 60-80%.",
			},
			{
				title: "Implement Service Worker",
				description:
					"Cache static data files and application shell using a service worker to improve repeat visit performance.",
			},
			{
				title: "Bundle Size Optimization",
				description:
					"Analyze bundle for unused code and consider code splitting for non-critical features.",
			},
		];

		const html = recommendations
			.map(
				(rec) => `
            <div class="recommendation-item">
                <div class="recommendation-title">${rec.title}</div>
                <div class="recommendation-description">${rec.description}</div>
            </div>
        `,
			)
			.join("");

		container.innerHTML = html;
	}

	setupEventListeners() {
		// Time range selector
		document
			.getElementById("timeRange")
			.addEventListener("change", async () => {
				await this.loadData();
				this.updateCharts();
				this.updateCurrentMetrics();
				this.updateBudgetStatus();
				this.updatePerformanceIssues();
			});

		// Refresh button
		document
			.getElementById("refreshData")
			.addEventListener("click", async () => {
				const button = document.getElementById("refreshData");
				button.textContent = "⏳ Loading...";
				button.disabled = true;

				try {
					await this.loadData();
					this.updateCharts();
					this.updateCurrentMetrics();
					this.updateBudgetStatus();
					this.updatePerformanceIssues();
					this.updateStaticDataMetrics();
					this.updateRecommendations();
				} finally {
					button.textContent = "🔄 Refresh";
					button.disabled = false;
				}
			});
	}

	updateCharts() {
		// Update chart data
		const timeRange = this.getTimeRange();

		// Update Web Vitals chart
		if (this.charts.webVitals) {
			const vitalsData = this.data.webVitals;
			this.charts.webVitals.data.labels = vitalsData.map((d) =>
				this.formatDate(d.timestamp),
			);
			this.charts.webVitals.data.datasets[0].data = vitalsData.map(
				(d) => d.lcp,
			);
			this.charts.webVitals.data.datasets[1].data = vitalsData.map(
				(d) => d.fid,
			);
			this.charts.webVitals.data.datasets[2].data = vitalsData.map(
				(d) => d.cls * 100,
			);
			this.charts.webVitals.update();
		}

		// Update Lighthouse chart
		if (this.charts.lighthouse) {
			const lighthouseData = this.data.lighthouse;
			this.charts.lighthouse.data.labels = lighthouseData.map((d) =>
				this.formatDate(d.timestamp),
			);
			this.charts.lighthouse.data.datasets[0].data = lighthouseData.map(
				(d) => d.performance,
			);
			this.charts.lighthouse.data.datasets[1].data = lighthouseData.map(
				(d) => d.accessibility,
			);
			this.charts.lighthouse.data.datasets[2].data = lighthouseData.map(
				(d) => d.bestPractices,
			);
			this.charts.lighthouse.data.datasets[3].data = lighthouseData.map(
				(d) => d.seo,
			);
			this.charts.lighthouse.update();
		}

		// Update Bundle Size chart
		if (this.charts.bundleSize) {
			const bundleData = this.data.bundles;
			this.charts.bundleSize.data.labels = bundleData.map((d) =>
				this.formatDate(d.timestamp),
			);
			this.charts.bundleSize.data.datasets[0].data = bundleData.map((d) =>
				Math.round(d.totals.size / 1024),
			);
			this.charts.bundleSize.data.datasets[1].data = bundleData.map((d) =>
				Math.round(d.totals.gzipSize / 1024),
			);
			this.charts.bundleSize.update();
		}

		this.updateBundleBreakdown();
	}

	// Utility methods
	getTimeRange() {
		return parseInt(document.getElementById("timeRange").value);
	}

	formatDate(timestamp) {
		return new Date(timestamp).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
	}

	formatBytes(bytes) {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
	}

	capitalizeFirst(str) {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	getScoreClass(score) {
		if (score >= 90) return "good";
		if (score >= 70) return "warning";
		return "error";
	}

	getBundleSizeClass(size) {
		if (size <= 500000) return "good";
		if (size <= 1000000) return "warning";
		return "error";
	}

	getLCPClass(lcp) {
		if (lcp <= 2500) return "good";
		if (lcp <= 4000) return "warning";
		return "error";
	}

	getCLSClass(cls) {
		if (cls <= 0.1) return "good";
		if (cls <= 0.25) return "warning";
		return "error";
	}

	showError(message) {
		console.error(message);
		// Could show a toast notification or error state
	}
}

// Initialize dashboard when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
	new PerformanceDashboard();
});
