/**
 * Runtime Performance Metrics Collection
 * Collects Core Web Vitals and custom metrics for CCL Test Viewer
 */

class PerformanceCollector {
	constructor() {
		this.metrics = new Map();
		this.customTimings = new Map();
		this.isCollecting = false;

		this.initializeCollection();
	}

	initializeCollection() {
		if (typeof window === "undefined") return;

		this.isCollecting = true;

		// Initialize Core Web Vitals collection
		this.initializeCoreWebVitals();

		// Initialize custom performance markers
		this.initializeCustomMarkers();

		// Setup automatic reporting
		this.setupReporting();
	}

	async initializeCoreWebVitals() {
		try {
			// Import web-vitals library
			const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import(
				"web-vitals"
			);

			// Collect Core Web Vitals
			getCLS(this.handleMetric.bind(this, "CLS"));
			getFID(this.handleMetric.bind(this, "FID"));
			getFCP(this.handleMetric.bind(this, "FCP"));
			getLCP(this.handleMetric.bind(this, "LCP"));
			getTTFB(this.handleMetric.bind(this, "TTFB"));
		} catch (error) {
			console.warn("Web Vitals library not available:", error);
			this.fallbackToPerformanceAPI();
		}
	}

	fallbackToPerformanceAPI() {
		// Fallback to Performance API if web-vitals is not available
		if (!performance || !performance.getEntriesByType) return;

		// Measure paint timings
		const paintEntries = performance.getEntriesByType("paint");
		paintEntries.forEach((entry) => {
			this.handleMetric(entry.name.toUpperCase().replace("-", ""), {
				value: entry.startTime,
				rating: this.getRating(entry.name, entry.startTime),
			});
		});

		// Measure navigation timing
		const navigation = performance.getEntriesByType("navigation")[0];
		if (navigation) {
			this.handleMetric("TTFB", {
				value: navigation.responseStart - navigation.requestStart,
				rating: this.getRating(
					"ttfb",
					navigation.responseStart - navigation.requestStart,
				),
			});
		}
	}

	initializeCustomMarkers() {
		// Mark start times for custom measurements
		this.markStart("app-init");
		this.markStart("data-load");

		// CCL Test Viewer specific markers
		this.setupCCLMarkers();
	}

	setupCCLMarkers() {
		// Mark when search index is ready
		document.addEventListener("search-index-ready", () => {
			this.markEnd("search-init");
			this.measureCustom("searchInitTime", "app-init", "search-init");
		});

		// Mark when test data is loaded
		document.addEventListener("test-data-loaded", () => {
			this.markEnd("data-load");
			this.measureCustom("dataLoadTime", "app-init", "data-load");
		});

		// Mark when test results are rendered
		document.addEventListener("test-results-rendered", () => {
			this.markEnd("test-render");
			this.measureCustom("testRenderTime", "test-render-start", "test-render");
		});

		// Setup observer for largest test render
		this.observeLargestTestRender();
	}

	observeLargestTestRender() {
		if (!window.PerformanceObserver) return;

		// Observe largest contentful paint for test results
		const observer = new PerformanceObserver((list) => {
			const entries = list.getEntries();
			const testContentEntries = entries.filter(
				(entry) =>
					entry.element &&
					(entry.element.classList?.contains("test-result") ||
						entry.element.querySelector?.(".test-result")),
			);

			if (testContentEntries.length > 0) {
				const largestTestEntry = testContentEntries.reduce((largest, entry) =>
					entry.size > largest.size ? entry : largest,
				);

				this.handleMetric("TEST_LCP", {
					value: largestTestEntry.startTime,
					element: largestTestEntry.element?.tagName || "unknown",
					size: largestTestEntry.size,
				});
			}
		});

		try {
			observer.observe({ entryTypes: ["largest-contentful-paint"] });
		} catch (e) {
			console.warn("LCP observation not supported");
		}
	}

	markStart(name) {
		if (performance && performance.mark) {
			performance.mark(`${name}-start`);
		}
	}

	markEnd(name) {
		if (performance && performance.mark) {
			performance.mark(`${name}-end`);
		}
	}

	measureCustom(metricName, startMark, endMark) {
		if (!performance || !performance.measure) return;

		try {
			const measureName = `custom-${metricName}`;
			performance.measure(measureName, `${startMark}-start`, `${endMark}-end`);

			const measure = performance.getEntriesByName(measureName)[0];
			if (measure) {
				this.handleMetric(metricName.toUpperCase(), {
					value: measure.duration,
					rating: this.getCustomRating(metricName, measure.duration),
				});
			}
		} catch (e) {
			console.warn(`Could not measure ${metricName}:`, e);
		}
	}

	handleMetric(name, metric) {
		const metricData = {
			name,
			value: metric.value || metric.duration,
			rating: metric.rating || "needs-improvement",
			timestamp: Date.now(),
			url: window.location.pathname,
			userAgent: navigator.userAgent,
			connection: this.getConnectionInfo(),
		};

		this.metrics.set(name, metricData);

		// Log metric for debugging
		console.log(
			`📊 ${name}: ${metricData.value.toFixed(2)}ms (${metricData.rating})`,
		);

		// Trigger custom event for listeners
		this.dispatchMetricEvent(metricData);
	}

	getConnectionInfo() {
		if (
			!navigator.connection &&
			!navigator.mozConnection &&
			!navigator.webkitConnection
		) {
			return null;
		}

		const connection =
			navigator.connection ||
			navigator.mozConnection ||
			navigator.webkitConnection;
		return {
			effectiveType: connection.effectiveType,
			downlink: connection.downlink,
			rtt: connection.rtt,
			saveData: connection.saveData,
		};
	}

	getRating(metricName, value) {
		const thresholds = {
			"first-contentful-paint": { good: 1800, needsImprovement: 3000 },
			"largest-contentful-paint": { good: 2500, needsImprovement: 4000 },
			"first-input-delay": { good: 100, needsImprovement: 300 },
			"cumulative-layout-shift": { good: 0.1, needsImprovement: 0.25 },
			ttfb: { good: 800, needsImprovement: 1800 },
		};

		const threshold = thresholds[metricName.toLowerCase()];
		if (!threshold) return "unknown";

		if (value <= threshold.good) return "good";
		if (value <= threshold.needsImprovement) return "needs-improvement";
		return "poor";
	}

	getCustomRating(metricName, value) {
		const customThresholds = {
			dataLoadTime: { good: 300, needsImprovement: 500 },
			searchInitTime: { good: 100, needsImprovement: 200 },
			testRenderTime: { good: 150, needsImprovement: 300 },
		};

		const threshold = customThresholds[metricName];
		if (!threshold) return "unknown";

		if (value <= threshold.good) return "good";
		if (value <= threshold.needsImprovement) return "needs-improvement";
		return "poor";
	}

	dispatchMetricEvent(metricData) {
		const event = new CustomEvent("performance-metric", {
			detail: metricData,
		});
		document.dispatchEvent(event);
	}

	setupReporting() {
		// Report metrics on page visibility change
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "hidden") {
				this.reportMetrics();
			}
		});

		// Report metrics before page unload
		window.addEventListener("beforeunload", () => {
			this.reportMetrics();
		});

		// Report metrics after a delay to capture LCP
		setTimeout(() => {
			this.reportMetrics();
		}, 5000);
	}

	async reportMetrics() {
		if (!this.isCollecting || this.metrics.size === 0) return;

		const report = {
			timestamp: new Date().toISOString(),
			url: window.location.href,
			userAgent: navigator.userAgent,
			viewport: {
				width: window.innerWidth,
				height: window.innerHeight,
			},
			connection: this.getConnectionInfo(),
			metrics: Array.from(this.metrics.entries()).map(([name, data]) => ({
				name,
				...data,
			})),
			performance: this.getPerformanceEntries(),
			customData: this.getCustomData(),
		};

		// Store locally
		this.storeLocal(report);

		// Send to analytics endpoint if available
		this.sendToEndpoint(report);
	}

	getPerformanceEntries() {
		if (!performance || !performance.getEntriesByType) return {};

		return {
			navigation: performance.getEntriesByType("navigation")[0] || null,
			paint: performance.getEntriesByType("paint") || [],
			resource: performance.getEntriesByType("resource").slice(-20) || [], // Last 20 resources
			measure: performance.getEntriesByType("measure") || [],
		};
	}

	getCustomData() {
		return {
			testCount: document.querySelectorAll(".test-result").length,
			searchEnabled: !!document.querySelector("[data-search]"),
			categoryCount: document.querySelectorAll(".category").length,
			hasErrors: document.querySelectorAll(".error").length > 0,
		};
	}

	storeLocal(report) {
		try {
			if (!localStorage) return;

			const key = `ccl-perf-${Date.now()}`;
			localStorage.setItem(key, JSON.stringify(report));

			// Clean up old reports (keep last 5)
			const keys = Object.keys(localStorage)
				.filter((k) => k.startsWith("ccl-perf-"))
				.sort();

			if (keys.length > 5) {
				keys.slice(0, -5).forEach((k) => localStorage.removeItem(k));
			}
		} catch (e) {
			console.warn("Could not store performance data locally:", e);
		}
	}

	async sendToEndpoint(report) {
		// This would send to your analytics endpoint
		// For development, just log to console
		if (process.env.NODE_ENV === "development") {
			console.log("📈 Performance Report:", report);
			return;
		}

		// In production, you would send to your analytics service
		// Example:
		// try {
		//   await fetch('/api/performance', {
		//     method: 'POST',
		//     headers: { 'Content-Type': 'application/json' },
		//     body: JSON.stringify(report)
		//   });
		// } catch (e) {
		//   console.warn('Could not send performance data:', e);
		// }
	}

	// Public API for manual measurements
	startMeasure(name) {
		this.markStart(name);
	}

	endMeasure(name) {
		this.markEnd(name);
		this.measureCustom(name, name, name);
	}

	getMetrics() {
		return Array.from(this.metrics.values());
	}

	clear() {
		this.metrics.clear();
		this.customTimings.clear();
	}
}

// Auto-initialize if in browser
let collector;
if (typeof window !== "undefined") {
	collector = new PerformanceCollector();

	// Expose globally for manual usage
	window.performanceCollector = collector;

	// Mark test render start when page loads
	document.addEventListener("DOMContentLoaded", () => {
		collector.markStart("test-render");
	});
}

export default PerformanceCollector;
