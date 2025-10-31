import type { Logger } from "@tylerbu/cli-api";
import {
	type ErrorCategory,
	type ErrorContext,
	isSailError,
	SailError,
	toSailError,
} from "./index.js";

/**
 * Centralized error handling strategy for Sail build system
 */
export class ErrorHandler {
	private readonly logger: Logger;
	private readonly errorCounts = new Map<ErrorCategory, number>();
	private readonly collectedErrors: SailError[] = [];

	constructor(logger: Logger) {
		this.logger = logger;
	}

	/**
	 * Handles an error with appropriate logging and recovery strategy
	 */
	public handleError(
		error: unknown,
		context: ErrorContext = {},
		strategy: ErrorHandlingStrategy = ErrorHandlingStrategy.Log,
	): ErrorHandlingResult {
		const sailError = this.ensureSailError(error, context);
		this.recordError(sailError);

		switch (strategy) {
			case ErrorHandlingStrategy.Log:
				return this.logError(sailError);

			case ErrorHandlingStrategy.Warn:
				return this.warnError(sailError);

			case ErrorHandlingStrategy.Collect:
				return this.collectError(sailError);

			case ErrorHandlingStrategy.Fatal:
				return this.fatalError(sailError);

			case ErrorHandlingStrategy.Retry:
				return this.retryableError(sailError);

			default:
				return this.logError(sailError);
		}
	}

	/**
	 * Handles async operations with proper error handling
	 */
	public async handleAsync<T>(
		operation: () => Promise<T>,
		context: ErrorContext = {},
		strategy: ErrorHandlingStrategy = ErrorHandlingStrategy.Log,
	): Promise<T | null> {
		try {
			return await operation();
		} catch (error) {
			const result = this.handleError(error, context, strategy);
			if (result.shouldThrow) {
				throw result.error;
			}
			return null;
		}
	}

	/**
	 * Safely executes an operation with error handling
	 */
	public safeExecute<T>(
		operation: () => T,
		fallback: T,
		context: ErrorContext = {},
	): T {
		try {
			return operation();
		} catch (error) {
			this.handleError(error, context, ErrorHandlingStrategy.Warn);
			return fallback;
		}
	}

	/**
	 * Gets error statistics for reporting
	 */
	public getErrorStatistics(): ErrorStatistics {
		const totalErrors = Array.from(this.errorCounts.values()).reduce(
			(sum, count) => sum + count,
			0,
		);
		const categoryCounts = Object.fromEntries(this.errorCounts);

		return {
			totalErrors,
			categoryCounts,
			collectedErrors: [...this.collectedErrors],
			hasErrors: totalErrors > 0,
		};
	}

	/**
	 * Gets a summary of all collected errors
	 */
	public getErrorSummary(): string {
		if (this.collectedErrors.length === 0) {
			return "No errors collected.";
		}

		const lines: string[] = [
			`${this.collectedErrors.length} error(s) collected:`,
		];

		for (const [category, count] of this.errorCounts) {
			lines.push(`  ${category}: ${count}`);
		}

		lines.push(""); // Empty line

		for (const error of this.collectedErrors) {
			lines.push(`• ${error.getUserMessage()}`);
		}

		return lines.join("\n");
	}

	/**
	 * Clears all collected errors and statistics
	 */
	public reset(): void {
		this.errorCounts.clear();
		this.collectedErrors.length = 0;
	}

	/**
	 * Creates an error handler for a specific context
	 */
	public createContextualHandler(
		baseContext: ErrorContext,
	): ContextualErrorHandler {
		return new ContextualErrorHandler(this, baseContext);
	}

	private ensureSailError(error: unknown, context: ErrorContext): SailError {
		const sailError = toSailError(error);

		// Merge additional context
		if (Object.keys(context).length > 0) {
			const mergedContext = { ...sailError.context, ...context };
			return new SailError(
				sailError.message,
				sailError.category,
				mergedContext,
				{
					isRetryable: sailError.isRetryable,
					userMessage: sailError.userMessage,
				},
			);
		}

		return sailError;
	}

	private recordError(error: SailError): void {
		const currentCount = this.errorCounts.get(error.category) ?? 0;
		this.errorCounts.set(error.category, currentCount + 1);
	}

	private logError(error: SailError): ErrorHandlingResult {
		this.logger.errorLog(error.getFormattedMessage());
		if (error.stack) {
			this.logger.verbose(`Stack trace: ${error.stack}`);
		}
		return { error, shouldThrow: false };
	}

	private warnError(error: SailError): ErrorHandlingResult {
		this.logger.warning(error.getUserMessage());
		return { error, shouldThrow: false };
	}

	private collectError(error: SailError): ErrorHandlingResult {
		this.collectedErrors.push(error);
		this.logger.verbose(`Error collected: ${error.getFormattedMessage()}`);
		return { error, shouldThrow: false };
	}

	private fatalError(error: SailError): ErrorHandlingResult {
		this.logger.errorLog(`Fatal error: ${error.getFormattedMessage()}`);
		if (error.stack) {
			this.logger.errorLog(`Stack trace: ${error.stack}`);
		}
		return { error, shouldThrow: true };
	}

	private retryableError(error: SailError): ErrorHandlingResult {
		if (error.isRetryable) {
			this.logger.warning(`Retryable error: ${error.getUserMessage()}`);
			return { error, shouldThrow: false };
		} else {
			return this.logError(error);
		}
	}
}

/**
 * Contextual error handler that automatically applies base context
 */
export class ContextualErrorHandler {
	constructor(
		private readonly errorHandler: ErrorHandler,
		private readonly baseContext: ErrorContext,
	) {}

	public handleError(
		error: unknown,
		additionalContext: ErrorContext = {},
		strategy: ErrorHandlingStrategy = ErrorHandlingStrategy.Log,
	): ErrorHandlingResult {
		const mergedContext = { ...this.baseContext, ...additionalContext };
		return this.errorHandler.handleError(error, mergedContext, strategy);
	}

	public async handleAsync<T>(
		operation: () => Promise<T>,
		additionalContext: ErrorContext = {},
		strategy: ErrorHandlingStrategy = ErrorHandlingStrategy.Log,
	): Promise<T | null> {
		const mergedContext = { ...this.baseContext, ...additionalContext };
		return this.errorHandler.handleAsync(operation, mergedContext, strategy);
	}

	public safeExecute<T>(
		operation: () => T,
		fallback: T,
		additionalContext: ErrorContext = {},
	): T {
		const mergedContext = { ...this.baseContext, ...additionalContext };
		return this.errorHandler.safeExecute(operation, fallback, mergedContext);
	}
}

/**
 * Strategy for handling different types of errors
 */
export enum ErrorHandlingStrategy {
	Log = "Log", // Log error and continue
	Warn = "Warn", // Log as warning and continue
	Collect = "Collect", // Collect error for later reporting
	Fatal = "Fatal", // Log error and throw
	Retry = "Retry", // Handle based on retryable flag
}

/**
 * Result of error handling operation
 */
export interface ErrorHandlingResult {
	error: SailError;
	shouldThrow: boolean;
}

/**
 * Statistics about handled errors
 */
export interface ErrorStatistics {
	totalErrors: number;
	categoryCounts: Record<string, number>;
	collectedErrors: SailError[];
	hasErrors: boolean;
}
