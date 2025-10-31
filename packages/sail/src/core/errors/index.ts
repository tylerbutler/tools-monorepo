// Export all error classes and types
export {
	ErrorCategory,
	type ErrorContext,
	SailError,
	type SailErrorJSON,
	type SailErrorOptions,
} from "./SailError.js";

// Import for use in functions
import { ErrorCategory, SailError } from "./SailError.js";

export {
	BuildError,
	type BuildErrorOptions,
	BuildPhase,
} from "./BuildError.js";
export { ConfigurationError } from "./ConfigurationError.js";
export { DependencyError } from "./DependencyError.js";
// Export error handler
export {
	ContextualErrorHandler,
	ErrorHandler,
	type ErrorHandlingResult,
	ErrorHandlingStrategy,
	type ErrorStatistics,
} from "./ErrorHandler.js";
export {
	ExecutionError,
	type ExecutionErrorOptions,
} from "./ExecutionError.js";
export {
	FileSystemError,
	type FileSystemErrorOptions,
} from "./FileSystemError.js";

// Utility function to check if an error is a SailError
export function isSailError(error: unknown): error is SailError {
	return error instanceof SailError;
}

// Utility function to get error category from any error
export function getErrorCategory(error: unknown): ErrorCategory {
	if (isSailError(error)) {
		return error.category;
	}
	return ErrorCategory.Internal;
}

// Utility function to convert any error to a SailError
export function toSailError(
	error: unknown,
	defaultCategory: ErrorCategory = ErrorCategory.Internal,
): SailError {
	if (isSailError(error)) {
		return error;
	}

	if (error instanceof Error) {
		return new SailError(error.message, defaultCategory);
	}

	const message = typeof error === "string" ? error : "Unknown error occurred";
	return new SailError(message, defaultCategory);
}
