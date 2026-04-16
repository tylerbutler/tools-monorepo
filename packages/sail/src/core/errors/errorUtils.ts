import { ErrorCategory, SailError } from "./SailError.js";

/**
 * Utility function to check if an error is a SailError
 */
export function isSailError(error: unknown): error is SailError {
	return error instanceof SailError;
}

/**
 * Utility function to get error category from any error
 */
export function getErrorCategory(error: unknown): ErrorCategory {
	if (isSailError(error)) {
		return error.category;
	}
	return ErrorCategory.Internal;
}

/**
 * Utility function to convert any error to a SailError
 */
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
