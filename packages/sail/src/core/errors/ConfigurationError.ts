import {
	ErrorCategory,
	type ErrorContext,
	SailError,
	type SailErrorOptions,
} from "./SailError.js";

/**
 * Error thrown when there are issues with task or build configuration
 */
export class ConfigurationError extends SailError {
	public constructor(
		message: string,
		context: ErrorContext = {},
		options: SailErrorOptions = {},
	) {
		super(message, ErrorCategory.Configuration, context, options);
	}

	/**
	 * Creates a ConfigurationError for missing script
	 */
	public static missingScript(
		scriptName: string,
		packageName?: string,
	): ConfigurationError {
		return new ConfigurationError(
			`Script not found for task definition '${scriptName}'`,
			{ packageName, taskName: scriptName },
			{
				userMessage: `Task '${scriptName}' requires a script but none was found in package.json`,
			},
		);
	}

	/**
	 * Creates a ConfigurationError for invalid task definition
	 */
	public static invalidTaskDefinition(
		taskName: string,
		reason: string,
		packageName?: string,
	): ConfigurationError {
		return new ConfigurationError(
			`Invalid task definition '${taskName}': ${reason}`,
			{ packageName, taskName },
			{
				userMessage: `Task '${taskName}' has invalid configuration: ${reason}`,
			},
		);
	}

	/**
	 * Creates a ConfigurationError for invalid dependency specifications
	 */
	public static invalidDependency(
		dependencyName: string,
		taskName: string,
		reason: string,
		packageName?: string,
	): ConfigurationError {
		return new ConfigurationError(
			`Invalid dependency '${dependencyName}' in task '${taskName}': ${reason}`,
			{ packageName, taskName },
			{
				userMessage: `Task '${taskName}' has invalid dependency '${dependencyName}': ${reason}`,
			},
		);
	}

	/**
	 * Creates a ConfigurationError for missing tasks
	 */
	public static noTasksFound(taskNames: string[]): ConfigurationError {
		return new ConfigurationError(
			`No task(s) found for '${taskNames.join(", ")}'`,
			{},
			{
				userMessage: `None of the requested tasks (${taskNames.join(", ")}) were found in any packages`,
			},
		);
	}
}
