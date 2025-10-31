import {
	ErrorCategory,
	type ErrorContext,
	SailError,
	type SailErrorOptions,
} from "./SailError.js";

/**
 * Error thrown when there are issues during the build process
 */
export class BuildError extends SailError {
	public readonly taskName?: string;
	public readonly phase?: BuildPhase;

	public constructor(
		message: string,
		context: ErrorContext = {},
		options: BuildErrorOptions = {},
	) {
		super(message, ErrorCategory.Build, context, options);
		this.taskName = context.taskName;
		this.phase = options.phase;
	}

	/**
	 * Creates a BuildError for task failures
	 */
	public static taskFailed(
		taskName: string,
		reason?: string,
		context: ErrorContext = {},
	): BuildError {
		const message = reason
			? `Task '${taskName}' failed: ${reason}`
			: `Task '${taskName}' failed`;

		return new BuildError(
			message,
			{ ...context, taskName },
			{
				phase: BuildPhase.Execution,
				userMessage: `Task '${taskName}' failed to complete successfully. ${reason ? `Reason: ${reason}` : "Check the task output for details."}`,
			},
		);
	}

	/**
	 * Creates a BuildError for compilation failures
	 */
	public static compilationFailed(
		packageName: string,
		taskName: string,
		errors: string[],
		context: ErrorContext = {},
	): BuildError {
		const errorCount = errors.length;
		const message = `Compilation failed in ${packageName} (${errorCount} error${errorCount === 1 ? "" : "s"})`;

		return new BuildError(
			message,
			{ ...context, packageName, taskName },
			{
				phase: BuildPhase.Compilation,
				userMessage: `Compilation failed with ${errorCount} error${errorCount === 1 ? "" : "s"}. Please fix the compilation errors and try again.`,
			},
		);
	}

	/**
	 * Creates a BuildError for dependency build failures
	 */
	public static dependencyBuildFailed(
		dependencyName: string,
		taskName: string,
		context: ErrorContext = {},
	): BuildError {
		return new BuildError(
			`Dependency '${dependencyName}' failed to build`,
			{ ...context, taskName },
			{
				phase: BuildPhase.Dependencies,
				userMessage: `Cannot build because dependency '${dependencyName}' failed to build. Please fix the dependency build errors first.`,
			},
		);
	}

	/**
	 * Creates a BuildError for build timeouts
	 */
	public static buildTimeout(
		timeoutMs: number,
		taskName?: string,
		context: ErrorContext = {},
	): BuildError {
		return new BuildError(
			`Build timed out after ${timeoutMs}ms`,
			{ ...context, taskName },
			{
				phase: BuildPhase.Execution,
				isRetryable: true,
				userMessage: `Build timed out after ${timeoutMs / 1000} seconds. The build process may be stuck or require more time to complete.`,
			},
		);
	}

	/**
	 * Creates a BuildError for failed package loading
	 */
	public static packageLoadFailed(
		packageName: string,
		directory: string,
		originalError: Error,
		context: ErrorContext = {},
	): BuildError {
		return new BuildError(
			`Failed to load build package in ${directory}: ${originalError.message}`,
			{ ...context, packageName, filePath: directory },
			{
				phase: BuildPhase.Initialization,
				userMessage: `Failed to load package '${packageName}' from ${directory}. Please check the package configuration and dependencies.`,
			},
		);
	}

	/**
	 * Creates a BuildError for up-to-date check failures
	 */
	public static upToDateCheckFailed(
		packageName: string,
		context: ErrorContext = {},
	): BuildError {
		return new BuildError(
			`Failed to check if package '${packageName}' is up to date`,
			{ ...context, packageName },
			{
				phase: BuildPhase.Analysis,
				isRetryable: true,
				userMessage: `Unable to determine if package '${packageName}' needs to be rebuilt. The build will proceed assuming it needs to be rebuilt.`,
			},
		);
	}

	/**
	 * Creates a BuildError for missing build targets
	 */
	public static noBuildTargets(
		taskNames: string[],
		context: ErrorContext = {},
	): BuildError {
		return new BuildError(
			`No build targets found for tasks: ${taskNames.join(", ")}`,
			context,
			{
				phase: BuildPhase.Planning,
				userMessage: `None of the specified tasks (${taskNames.join(", ")}) have any packages to build. Please check your task names and package configuration.`,
			},
		);
	}

	/**
	 * Converts to JSON with build-specific fields
	 */
	public override toJSON() {
		return {
			...super.toJSON(),
			phase: this.phase,
		};
	}
}

/**
 * Phases of the build process where errors can occur
 */
export enum BuildPhase {
	Initialization = "Initialization",
	Planning = "Planning",
	Analysis = "Analysis",
	Dependencies = "Dependencies",
	Compilation = "Compilation",
	Execution = "Execution",
	Finalization = "Finalization",
}

/**
 * Options specific to BuildError
 */
export interface BuildErrorOptions extends SailErrorOptions {
	phase?: BuildPhase;
}
