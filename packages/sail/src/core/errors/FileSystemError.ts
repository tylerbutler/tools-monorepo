import {
	ErrorCategory,
	type ErrorContext,
	SailError,
	type SailErrorOptions,
} from "./SailError.js";

/**
 * Error thrown when there are issues with file system operations
 */
export class FileSystemError extends SailError {
	public readonly operation?: string;
	public readonly errno?: number;

	public constructor(
		message: string,
		context: ErrorContext = {},
		options: FileSystemErrorOptions = {},
	) {
		super(message, ErrorCategory.FileSystem, context, options);
		this.operation = options.operation;
		this.errno = options.errno;
	}

	/**
	 * Creates a FileSystemError for missing files
	 */
	public static fileNotFound(
		filePath: string,
		operation?: string,
		context: ErrorContext = {},
	): FileSystemError {
		return new FileSystemError(
			`File not found: ${filePath}`,
			{ ...context, filePath },
			{
				operation,
				userMessage: `Required file '${filePath}' was not found. Please check that the file exists and is accessible.`,
			},
		);
	}

	/**
	 * Creates a FileSystemError for permission issues
	 */
	public static permissionDenied(
		filePath: string,
		operation?: string,
		context: ErrorContext = {},
	): FileSystemError {
		return new FileSystemError(
			`Permission denied: ${filePath}`,
			{ ...context, filePath },
			{
				operation,
				userMessage: `Permission denied accessing '${filePath}'. Please check file permissions and ensure you have the necessary access rights.`,
			},
		);
	}

	/**
	 * Creates a FileSystemError for lock file issues
	 */
	public static lockFileNotFound(
		packageName: string,
		context: ErrorContext = {},
	): FileSystemError {
		return new FileSystemError(
			`Lock file not found for package ${packageName}`,
			{ ...context, packageName },
			{
				operation: "lockfile",
				userMessage: `Lock file not found for package '${packageName}'. Please run 'npm install' or your package manager's install command.`,
			},
		);
	}

	/**
	 * Creates a FileSystemError for directory operations
	 */
	public static directoryNotFound(
		dirPath: string,
		operation?: string,
		context: ErrorContext = {},
	): FileSystemError {
		return new FileSystemError(
			`Directory not found: ${dirPath}`,
			{ ...context, filePath: dirPath },
			{
				operation,
				userMessage: `Required directory '${dirPath}' was not found. Please check that the directory exists.`,
			},
		);
	}

	/**
	 * Creates a FileSystemError for read/write operations
	 */
	public static ioError(
		filePath: string,
		operation: string,
		originalError: Error,
		context: ErrorContext = {},
	): FileSystemError {
		return new FileSystemError(
			`I/O error during ${operation} of ${filePath}: ${originalError.message}`,
			{ ...context, filePath },
			{
				operation,
				isRetryable: true,
				userMessage: `Failed to ${operation} file '${filePath}'. This might be a temporary issue - please try again.`,
			},
		);
	}

	/**
	 * Creates a FileSystemError for file deletion failures
	 */
	public static deleteFailed(
		filePath: string,
		reason?: string,
		context: ErrorContext = {},
	): FileSystemError {
		const message = reason
			? `Failed to delete ${filePath}: ${reason}`
			: `Failed to delete ${filePath}`;

		return new FileSystemError(
			message,
			{ ...context, filePath },
			{
				operation: "delete",
				isRetryable: true,
				userMessage: `Unable to delete file '${filePath}'. ${reason ? `Reason: ${reason}` : "Please check if the file is in use or if you have sufficient permissions."}`,
			},
		);
	}

	/**
	 * Converts to JSON with file system-specific fields
	 */
	public override toJSON() {
		return {
			...super.toJSON(),
			operation: this.operation,
			errno: this.errno,
		};
	}
}

/**
 * Options specific to FileSystemError
 */
export interface FileSystemErrorOptions extends SailErrorOptions {
	operation?: string;
	errno?: number;
}
