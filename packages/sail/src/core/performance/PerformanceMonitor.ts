/**
 * Performance monitoring utilities for Sail build system.
 * Tracks timing, memory usage, and other performance metrics.
 * @internal
 */
export class PerformanceMonitor {
	private readonly metrics = new Map<string, PerformanceMetric>();
	private readonly timers = new Map<string, PerformanceTimer>();

	/**
	 * Start timing an operation
	 */
	public startTimer(
		name: string,
		metadata?: Record<string, unknown>,
	): PerformanceTimer {
		const timer = new PerformanceTimer(name, metadata);
		this.timers.set(name, timer);
		return timer;
	}

	/**
	 * End timing an operation and record the metric
	 */
	public endTimer(name: string): PerformanceMetric | undefined {
		const timer = this.timers.get(name);
		if (!timer) {
			return undefined;
		}

		const metric = timer.end();
		this.timers.delete(name);
		this.recordMetric(metric);
		return metric;
	}

	/**
	 * Time an async operation
	 */
	public async timeAsync<T>(
		name: string,
		operation: () => Promise<T>,
		metadata?: Record<string, unknown>,
	): Promise<{ result: T; metric: PerformanceMetric }> {
		const timer = this.startTimer(name, metadata);
		try {
			const result = await operation();
			const metric = this.endTimer(name);
			if (!metric) {
				throw new Error(`Timer '${name}' not found`);
			}
			return { result, metric };
		} catch (error) {
			timer.cancel();
			this.timers.delete(name);
			throw error;
		}
	}

	/**
	 * Time a synchronous operation
	 */
	public timeSync<T>(
		name: string,
		operation: () => T,
		metadata?: Record<string, unknown>,
	): { result: T; metric: PerformanceMetric } {
		const timer = this.startTimer(name, metadata);
		try {
			const result = operation();
			const metric = this.endTimer(name);
			if (!metric) {
				throw new Error(`Timer '${name}' not found`);
			}
			return { result, metric };
		} catch (error) {
			timer.cancel();
			this.timers.delete(name);
			throw error;
		}
	}

	/**
	 * Record a custom metric
	 */
	public recordMetric(metric: PerformanceMetric): void {
		const existingMetric = this.metrics.get(metric.name);
		if (existingMetric) {
			// Aggregate with existing metric
			existingMetric.count += metric.count;
			existingMetric.totalDuration += metric.totalDuration;
			existingMetric.minDuration = Math.min(
				existingMetric.minDuration,
				metric.minDuration,
			);
			existingMetric.maxDuration = Math.max(
				existingMetric.maxDuration,
				metric.maxDuration,
			);
			existingMetric.lastDuration = metric.lastDuration;
			existingMetric.endTime = metric.endTime;
		} else {
			this.metrics.set(metric.name, { ...metric });
		}
	}

	/**
	 * Get current memory usage
	 */
	public getMemoryUsage(): NodeJS.MemoryUsage {
		return process.memoryUsage();
	}

	/**
	 * Record memory usage at a specific point
	 */
	public recordMemoryUsage(label: string): MemoryMetric {
		const usage = this.getMemoryUsage();
		const metric: MemoryMetric = {
			label,
			timestamp: Date.now(),
			heapUsed: usage.heapUsed,
			heapTotal: usage.heapTotal,
			external: usage.external,
			rss: usage.rss,
		};
		return metric;
	}

	/**
	 * Get all recorded metrics
	 */
	public getMetrics(): PerformanceMetric[] {
		return Array.from(this.metrics.values());
	}

	/**
	 * Get metrics for a specific operation
	 */
	public getMetric(name: string): PerformanceMetric | undefined {
		return this.metrics.get(name);
	}

	/**
	 * Generate performance report
	 */
	public generateReport(): PerformanceReport {
		const metrics = this.getMetrics();
		const totalOperations = metrics.reduce((sum, m) => sum + m.count, 0);
		const totalTime = metrics.reduce((sum, m) => sum + m.totalDuration, 0);

		// Find slowest operations
		const slowestOperations = metrics
			.filter((m) => m.count > 0)
			.sort((a, b) => b.maxDuration - a.maxDuration)
			.slice(0, 5);

		// Find most frequent operations
		const mostFrequentOperations = metrics
			.filter((m) => m.count > 0)
			.sort((a, b) => b.count - a.count)
			.slice(0, 5);

		// Find operations taking the most total time
		const totalTimeConsumers = metrics
			.filter((m) => m.count > 0)
			.sort((a, b) => b.totalDuration - a.totalDuration)
			.slice(0, 5);

		return {
			totalOperations,
			totalTime,
			averageTime: totalOperations > 0 ? totalTime / totalOperations : 0,
			metrics,
			slowestOperations,
			mostFrequentOperations,
			totalTimeConsumers,
			memoryUsage: this.getMemoryUsage(),
		};
	}

	/**
	 * Clear all metrics
	 */
	public reset(): void {
		this.metrics.clear();
		this.timers.clear();
	}

	/**
	 * Export metrics to JSON
	 */
	public exportMetrics(): string {
		const report = this.generateReport();
		return JSON.stringify(report, null, 2);
	}
}

/**
 * Timer for measuring operation duration
 * @internal
 */
export class PerformanceTimer {
	private startTime: number;
	private startMemory?: NodeJS.MemoryUsage;

	public constructor(
		public readonly name: string,
		public readonly metadata: Record<string, unknown> = {},
	) {
		this.startTime = performance.now();
		this.startMemory = process.memoryUsage();
	}

	/**
	 * End the timer and return performance metric
	 */
	public end(): PerformanceMetric {
		const endTime = performance.now();
		const duration = endTime - this.startTime;
		const endMemory = process.memoryUsage();

		return {
			name: this.name,
			startTime: this.startTime,
			endTime,
			lastDuration: duration,
			totalDuration: duration,
			minDuration: duration,
			maxDuration: duration,
			count: 1,
			metadata: this.metadata,
			memoryDelta: this.startMemory
				? {
						heapUsed: endMemory.heapUsed - this.startMemory.heapUsed,
						heapTotal: endMemory.heapTotal - this.startMemory.heapTotal,
						external: endMemory.external - this.startMemory.external,
						rss: endMemory.rss - this.startMemory.rss,
					}
				: undefined,
		};
	}

	/**
	 * Cancel the timer without recording
	 */
	public cancel(): void {
		// Timer is cancelled, no metric will be recorded
	}
}

/**
 * Performance metric data
 * @internal
 */
export interface PerformanceMetric {
	name: string;
	startTime: number;
	endTime: number;
	lastDuration: number;
	totalDuration: number;
	minDuration: number;
	maxDuration: number;
	count: number;
	metadata?: Record<string, unknown>;
	memoryDelta?: MemoryDelta;
}

/**
 * Memory usage metric
 * @internal
 */
export interface MemoryMetric {
	label: string;
	timestamp: number;
	heapUsed: number;
	heapTotal: number;
	external: number;
	rss: number;
}

/**
 * Memory usage delta
 * @internal
 */
export interface MemoryDelta {
	heapUsed: number;
	heapTotal: number;
	external: number;
	rss: number;
}

/**
 * Complete performance report
 * @internal
 */
export interface PerformanceReport {
	totalOperations: number;
	totalTime: number;
	averageTime: number;
	metrics: PerformanceMetric[];
	slowestOperations: PerformanceMetric[];
	mostFrequentOperations: PerformanceMetric[];
	totalTimeConsumers: PerformanceMetric[];
	memoryUsage: NodeJS.MemoryUsage;
}

/**
 * Global performance monitor instance
 */
export const globalPerformanceMonitor = new PerformanceMonitor();
