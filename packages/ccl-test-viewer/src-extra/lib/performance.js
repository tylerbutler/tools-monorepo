/**
 * SvelteKit Performance Integration
 * Integrates with the performance monitoring system
 */

import PerformanceCollector from "../../performance/scripts/collect-metrics.js";

let collector;

/**
 * Initialize performance monitoring for SvelteKit app
 */
export function initializePerformanceMonitoring() {
	if (typeof window === "undefined") return;

	collector = new PerformanceCollector();

	// Mark when SvelteKit app starts
	collector.markStart("sveltekit-app");

	// Listen for SvelteKit navigation events
	document.addEventListener("sveltekit:navigation-start", () => {
		collector.markStart("navigation");
	});

	document.addEventListener("sveltekit:navigation-end", () => {
		collector.markEnd("navigation");
		collector.measureCustom("navigationTime", "navigation", "navigation");
	});

	return collector;
}

/**
 * Mark when test data is loaded
 */
export function markTestDataLoaded() {
	if (collector) {
		// Dispatch custom event for performance collector
		document.dispatchEvent(new CustomEvent("test-data-loaded"));
	}
}

/**
 * Mark when search index is ready
 */
export function markSearchReady() {
	if (collector) {
		document.dispatchEvent(new CustomEvent("search-index-ready"));
	}
}

/**
 * Mark when test results are rendered
 */
export function markTestResultsRendered() {
	if (collector) {
		collector.markStart("test-render");
		document.dispatchEvent(new CustomEvent("test-results-rendered"));
	}
}

/**
 * Custom timing for specific operations
 */
export function timeOperation(name, operation) {
	if (!collector) return operation();

	collector.markStart(name);

	if (typeof operation === "function") {
		const result = operation();

		if (result && typeof result.then === "function") {
			// Handle async operations
			return result.finally(() => {
				collector.markEnd(name);
				collector.measureCustom(name, name, name);
			});
		} else {
			// Handle sync operations
			collector.markEnd(name);
			collector.measureCustom(name, name, name);
			return result;
		}
	}

	return operation;
}

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics() {
	return collector ? collector.getMetrics() : [];
}

/**
 * Performance wrapper for Svelte components
 */
export function withPerformanceTracking(componentName) {
	return {
		onMount() {
			collector?.markStart(`component-${componentName}`);
		},
		onDestroy() {
			collector?.markEnd(`component-${componentName}`);
			collector?.measureCustom(
				`${componentName}Lifetime`,
				`component-${componentName}`,
				`component-${componentName}`,
			);
		},
	};
}

/**
 * Track component render time
 */
export function trackComponentRender(componentName, renderFn) {
	if (!collector) return renderFn();

	return timeOperation(`render-${componentName}`, renderFn);
}

/**
 * Performance budget checker
 */
export class PerformanceBudget {
	constructor(budgets) {
		this.budgets = budgets || {
			dataLoadTime: 500,
			searchInitTime: 100,
			testRenderTime: 200,
			navigationTime: 150,
		};
		this.violations = [];
	}

	checkBudget(metricName, value) {
		const budget = this.budgets[metricName];
		if (budget && value > budget) {
			const violation = {
				metric: metricName,
				value,
				budget,
				violation: value - budget,
				timestamp: Date.now(),
			};

			this.violations.push(violation);

			// Log violation
			console.warn(`⚠️ Performance budget violation: ${metricName}`, violation);

			// Dispatch event for monitoring
			document.dispatchEvent(
				new CustomEvent("performance-budget-violation", {
					detail: violation,
				}),
			);

			return false;
		}

		return true;
	}

	getViolations() {
		return this.violations;
	}

	clearViolations() {
		this.violations = [];
	}
}

// Create global budget checker
export const performanceBudget = new PerformanceBudget();

/**
 * Monitor performance budget automatically
 */
export function startBudgetMonitoring() {
	if (typeof window === "undefined") return;

	document.addEventListener("performance-metric", (event) => {
		const { name, value } = event.detail;

		// Convert metric names to budget keys
		const budgetKey = name.toLowerCase().replace(/[^a-z]/g, "");

		performanceBudget.checkBudget(budgetKey, value);
	});

	// Monitor budget violations
	document.addEventListener("performance-budget-violation", (event) => {
		const violation = event.detail;

		// In development, show console warnings
		if (import.meta.env.DEV) {
			console.group(`⚠️ Performance Budget Violation: ${violation.metric}`);
			console.log(`Expected: ≤${violation.budget}ms`);
			console.log(`Actual: ${violation.value}ms`);
			console.log(`Violation: +${violation.violation}ms`);
			console.groupEnd();
		}

		// In production, could send to analytics
		// sendAnalytics('performance_budget_violation', violation);
	});
}

/**
 * CCL Test Viewer specific performance helpers
 */
export const CCLPerformance = {
	/**
	 * Track category loading performance
	 */
	trackCategoryLoad: (categoryName, loadFn) => {
		return timeOperation(`load-category-${categoryName}`, loadFn);
	},

	/**
	 * Track search performance
	 */
	trackSearch: (query, searchFn) => {
		const operation = () => {
			collector?.markStart("search-query");
			const result = searchFn();
			collector?.markEnd("search-query");
			collector?.measureCustom(
				"searchQueryTime",
				"search-query",
				"search-query",
			);
			return result;
		};

		return timeOperation(`search-${query.length}chars`, operation);
	},

	/**
	 * Track test filtering performance
	 */
	trackFilter: (filterType, filterFn) => {
		return timeOperation(`filter-${filterType}`, filterFn);
	},

	/**
	 * Track pagination performance
	 */
	trackPagination: (page, paginationFn) => {
		return timeOperation(`pagination-page${page}`, paginationFn);
	},

	/**
	 * Monitor large data operations
	 */
	monitorDataOperation: (operationName, dataSize, operationFn) => {
		const start = performance.now();

		const operation = () => {
			const result = operationFn();
			const duration = performance.now() - start;

			// Log performance for large data operations
			if (dataSize > 1000 || duration > 100) {
				console.log(
					`📊 ${operationName}: ${duration.toFixed(1)}ms for ${dataSize} items`,
				);
			}

			return result;
		};

		return timeOperation(operationName, operation);
	},
};

// Export performance collector for direct access
export { collector as performanceCollector };
