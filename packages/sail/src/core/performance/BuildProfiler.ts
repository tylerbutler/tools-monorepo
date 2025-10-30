import type { Logger } from "@tylerbu/cli-api";
import {
	PerformanceMonitor,
	type PerformanceReport,
} from "./PerformanceMonitor.js";

/**
 * Specialized profiler for build operations with domain-specific metrics
 */
export class BuildProfiler {
	private readonly performanceMonitor = new PerformanceMonitor();
	private buildStartTime?: number;
	private packageMetrics = new Map<string, PackageMetrics>();

	constructor(private readonly logger: Logger) {}

	/**
	 * Start profiling a build
	 */
	public startBuild(): void {
		this.buildStartTime = performance.now();
		this.performanceMonitor.reset();
		this.packageMetrics.clear();
		this.performanceMonitor.startTimer("total-build");
	}

	/**
	 * End profiling a build and generate report
	 */
	public endBuild(): BuildPerformanceReport {
		const totalBuildMetric = this.performanceMonitor.endTimer("total-build");
		const report = this.performanceMonitor.generateReport();

		return {
			...report,
			buildDuration: totalBuildMetric?.lastDuration ?? 0,
			packageMetrics: Array.from(this.packageMetrics.values()),
			recommendations: this.generateRecommendations(report),
		};
	}

	/**
	 * Profile package dependency resolution
	 */
	public async profileDependencyResolution<T>(
		operation: () => Promise<T>,
		packageCount: number,
	): Promise<T> {
		const { result, metric } = await this.performanceMonitor.timeAsync(
			"dependency-resolution",
			operation,
			{ packageCount },
		);

		this.logger.verbose(
			`Dependency resolution completed in ${metric.lastDuration.toFixed(2)}ms for ${packageCount} packages`,
		);
		return result;
	}

	/**
	 * Profile task creation
	 */
	public profileTaskCreation<T>(
		operation: () => T,
		packageName: string,
		taskCount: number,
	): T {
		const { result, metric } = this.performanceMonitor.timeSync(
			`task-creation-${packageName}`,
			operation,
			{ packageName, taskCount },
		);

		this.updatePackageMetrics(packageName, {
			taskCreationTime: metric.lastDuration,
			taskCount,
		});

		return result;
	}

	/**
	 * Profile task execution
	 */
	public async profileTaskExecution<T>(
		operation: () => Promise<T>,
		packageName: string,
		taskName: string,
	): Promise<T> {
		const { result, metric } = await this.performanceMonitor.timeAsync(
			`task-execution`,
			operation,
			{ packageName, taskName },
		);

		this.updatePackageMetrics(packageName, {
			taskExecutionTime:
				(this.packageMetrics.get(packageName)?.taskExecutionTime ?? 0) +
				metric.lastDuration,
		});

		return result;
	}

	/**
	 * Profile file operations
	 */
	public async profileFileOperation<T>(
		operation: () => Promise<T>,
		operationType: FileOperationType,
		filePath?: string,
	): Promise<T> {
		const { result, metric } = await this.performanceMonitor.timeAsync(
			`file-${operationType}`,
			operation,
			{ filePath, operationType },
		);

		if (metric.lastDuration > 100) {
			// Log slow file operations
			this.logger.verbose(
				`Slow file ${operationType}: ${filePath} took ${metric.lastDuration.toFixed(2)}ms`,
			);
		}

		return result;
	}

	/**
	 * Profile configuration parsing
	 */
	public profileConfigurationParsing<T>(
		operation: () => T,
		packageName: string,
		configType: string,
	): T {
		const { result, metric } = this.performanceMonitor.timeSync(
			`config-parsing-${configType}`,
			operation,
			{ packageName, configType },
		);

		this.updatePackageMetrics(packageName, {
			configParsingTime:
				(this.packageMetrics.get(packageName)?.configParsingTime ?? 0) +
				metric.lastDuration,
		});

		return result;
	}

	/**
	 * Record cache hit/miss statistics
	 */
	public recordCacheEvent(
		type: CacheEventType,
		key: string,
		hit: boolean,
	): void {
		const metricName = `cache-${type}-${hit ? "hit" : "miss"}`;
		this.performanceMonitor.recordMetric({
			name: metricName,
			startTime: performance.now(),
			endTime: performance.now(),
			lastDuration: 0,
			totalDuration: 0,
			minDuration: 0,
			maxDuration: 0,
			count: 1,
			metadata: { key, type, hit },
		});
	}

	/**
	 * Get current performance snapshot
	 */
	public getSnapshot(): PerformanceReport {
		return this.performanceMonitor.generateReport();
	}

	/**
	 * Log performance report
	 */
	public logReport(report: BuildPerformanceReport): void {
		this.logger.log("\n=== Build Performance Report ===");
		this.logger.log(`Total build time: ${report.buildDuration.toFixed(2)}ms`);
		this.logger.log(`Total operations: ${report.totalOperations}`);
		this.logger.log(
			`Average operation time: ${report.averageTime.toFixed(2)}ms`,
		);

		if (report.slowestOperations.length > 0) {
			this.logger.log("\nSlowest operations:");
			for (const op of report.slowestOperations.slice(0, 3)) {
				this.logger.log(
					`  ${op.name}: ${op.maxDuration.toFixed(2)}ms (${op.count} times)`,
				);
			}
		}

		if (report.totalTimeConsumers.length > 0) {
			this.logger.log("\nTime consumers:");
			for (const op of report.totalTimeConsumers.slice(0, 3)) {
				this.logger.log(
					`  ${op.name}: ${op.totalDuration.toFixed(2)}ms total (${op.count} times)`,
				);
			}
		}

		if (report.recommendations.length > 0) {
			this.logger.log("\nPerformance recommendations:");
			for (const rec of report.recommendations) {
				this.logger.log(`  • ${rec}`);
			}
		}

		const memMB = (report.memoryUsage.heapUsed / 1024 / 1024).toFixed(1);
		this.logger.log(`\nMemory usage: ${memMB}MB heap used`);
	}

	private updatePackageMetrics(
		packageName: string,
		updates: Partial<PackageMetrics>,
	): void {
		const existing = this.packageMetrics.get(packageName) ?? {
			packageName,
			taskCreationTime: 0,
			taskExecutionTime: 0,
			configParsingTime: 0,
			taskCount: 0,
		};

		this.packageMetrics.set(packageName, { ...existing, ...updates });
	}

	private generateRecommendations(report: PerformanceReport): string[] {
		const recommendations: string[] = [];

		// Check for slow operations
		const slowOps = report.slowestOperations.filter(
			(op) => op.maxDuration > 1000,
		);
		if (slowOps.length > 0) {
			recommendations.push(
				`Consider optimizing slow operations: ${slowOps.map((op) => op.name).join(", ")}`,
			);
		}

		// Check memory usage
		const memoryMB = report.memoryUsage.heapUsed / 1024 / 1024;
		if (memoryMB > 500) {
			recommendations.push(
				`High memory usage detected (${memoryMB.toFixed(1)}MB). Consider increasing worker limits or reducing concurrency.`,
			);
		}

		// Check for frequently called operations
		const frequentOps = report.mostFrequentOperations.filter(
			(op) => op.count > 100,
		);
		if (frequentOps.length > 0) {
			recommendations.push(
				`Frequently called operations detected: ${frequentOps.map((op) => `${op.name} (${op.count}x)`).join(", ")}. Consider caching.`,
			);
		}

		// Check cache metrics
		const cacheHits = report.metrics
			.filter((m) => m.name.includes("cache-") && m.name.includes("-hit"))
			.reduce((sum, m) => sum + m.count, 0);
		const cacheMisses = report.metrics
			.filter((m) => m.name.includes("cache-") && m.name.includes("-miss"))
			.reduce((sum, m) => sum + m.count, 0);
		const totalCacheOps = cacheHits + cacheMisses;

		if (totalCacheOps > 0) {
			const hitRate = (cacheHits / totalCacheOps) * 100;
			if (hitRate < 70) {
				recommendations.push(
					`Low cache hit rate (${hitRate.toFixed(1)}%). Consider cache optimization.`,
				);
			}
		}

		return recommendations;
	}
}

/**
 * Package-specific performance metrics
 */
export interface PackageMetrics {
	packageName: string;
	taskCreationTime: number;
	taskExecutionTime: number;
	configParsingTime: number;
	taskCount: number;
}

/**
 * Extended performance report for builds
 */
export interface BuildPerformanceReport extends PerformanceReport {
	buildDuration: number;
	packageMetrics: PackageMetrics[];
	recommendations: string[];
}

/**
 * Types of file operations to profile
 */
export enum FileOperationType {
	Read = "read",
	Write = "write",
	Stat = "stat",
	Hash = "hash",
	Glob = "glob",
}

/**
 * Types of cache events
 */
export enum CacheEventType {
	FileHash = "file-hash",
	TaskResult = "task-result",
	Configuration = "configuration",
}
