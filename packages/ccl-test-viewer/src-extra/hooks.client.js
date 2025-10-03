/**
 * SvelteKit Client Hooks
 * Initialize performance monitoring and handle client-side setup
 */

import {
	initializePerformanceMonitoring,
	startBudgetMonitoring,
} from "$lib/performance.js";

// Initialize performance monitoring when the app starts
initializePerformanceMonitoring();
startBudgetMonitoring();

console.log("🚀 CCL Test Viewer performance monitoring initialized");
