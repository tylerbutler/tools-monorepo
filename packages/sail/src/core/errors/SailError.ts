/**
 * Base class for all Sail-specific errors.
 * Provides standardized error handling with context, categories, and metadata.
 */
export class SailError extends Error {
	public readonly category: ErrorCategory;
	public readonly context: ErrorContext;
	public readonly isRetryable: boolean;
	public readonly userMessage?: string;

	public constructor(
		message: string,
		category: ErrorCategory,
		context: ErrorContext = {},
		options: SailErrorOptions = {},
	) {
		super(message);
		this.name = this.constructor.name;
		this.category = category;
		this.context = context;
		this.isRetryable = options.isRetryable ?? false;
		this.userMessage = options.userMessage;

		// Maintain proper stack trace for V8
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}

	/**
	 * Returns a formatted error message including context
	 */
	public getFormattedMessage(): string {
		const parts: string[] = [this.message];

		if (this.context.packageName) {
			parts.unshift(`${this.context.packageName}:`);
		}

		if (this.context.taskName) {
			parts.push(`(task: ${this.context.taskName})`);
		}

		return parts.join(" ");
	}

	/**
	 * Returns user-friendly error message or falls back to formatted message
	 */
	public getUserMessage(): string {
		return this.userMessage ?? this.getFormattedMessage();
	}

	/**
	 * Converts error to JSON for logging/serialization
	 */
	public toJSON(): SailErrorJSON {
		return {
			name: this.name,
			message: this.message,
			category: this.category,
			context: this.context,
			isRetryable: this.isRetryable,
			userMessage: this.userMessage,
			stack: this.stack,
		};
	}
}

/**
 * Categories of errors that can occur in Sail
 */
export const ErrorCategory = {
	Configuration: "Configuration",
	Dependency: "Dependency",
	FileSystem: "FileSystem",
	Execution: "Execution",
	Build: "Build",
	Worker: "Worker",
	Validation: "Validation",
	Network: "Network",
	Internal: "Internal",
} as const;

/**
 * Error category type
 */
export type ErrorCategory = (typeof ErrorCategory)[keyof typeof ErrorCategory];

/**
 * Context information that provides additional details about where/when the error occurred
 */
export interface ErrorContext {
	packageName?: string;
	taskName?: string;
	filePath?: string;
	command?: string;
	workerId?: string;
	dependencyChain?: string[];
}

/**
 * Options for configuring error behavior
 */
export interface SailErrorOptions {
	isRetryable?: boolean;
	userMessage?: string;
}

/**
 * JSON representation of a SailError for serialization
 */
export interface SailErrorJSON {
	name: string;
	message: string;
	category: ErrorCategory;
	context: ErrorContext;
	isRetryable: boolean;
	userMessage?: string;
	stack?: string;
}
