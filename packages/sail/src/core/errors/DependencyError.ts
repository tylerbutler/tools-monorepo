import {
	ErrorCategory,
	type ErrorContext,
	SailError,
	type SailErrorOptions,
} from "./SailError.js";

/**
 * Error thrown when there are issues with package or task dependencies
 */
export class DependencyError extends SailError {
	constructor(
		message: string,
		context: ErrorContext = {},
		options: SailErrorOptions = {},
	) {
		super(message, ErrorCategory.Dependency, context, options);
	}

	/**
	 * Creates a DependencyError for circular package dependencies
	 */
	static circularPackageDependency(
		packageChain: string[],
		currentPackage?: string,
	): DependencyError {
		const chain = packageChain.join(" -> ");
		return new DependencyError(
			`Circular package dependency detected: ${chain}`,
			{
				packageName: currentPackage,
				dependencyChain: packageChain,
			},
			{
				userMessage: `Circular dependency detected in packages: ${chain}. Please remove this circular reference.`,
			},
		);
	}

	/**
	 * Creates a DependencyError for circular task dependencies
	 */
	static circularTaskDependency(
		taskChain: string[],
		packageName?: string,
	): DependencyError {
		const chain = taskChain.join(" -> ");
		return new DependencyError(
			`Circular dependency in dependent tasks: ${chain}`,
			{
				packageName,
				dependencyChain: taskChain,
			},
			{
				userMessage: `Circular task dependency detected: ${chain}. Please remove this circular reference.`,
			},
		);
	}

	/**
	 * Creates a DependencyError for missing package dependencies
	 */
	static missingPackageDependency(
		dependencyName: string,
		packageName?: string,
	): DependencyError {
		return new DependencyError(
			`Missing package dependency '${dependencyName}'`,
			{ packageName },
			{
				userMessage: `Package '${dependencyName}' is required but not found. Please check your package.json dependencies.`,
			},
		);
	}

	/**
	 * Creates a DependencyError for version mismatches
	 */
	static versionMismatch(
		dependencyName: string,
		expectedVersion: string,
		actualVersion: string,
		packageName?: string,
	): DependencyError {
		return new DependencyError(
			`Version mismatch for '${dependencyName}': expected ${expectedVersion}, got ${actualVersion}`,
			{ packageName },
			{
				userMessage: `Package '${dependencyName}' version mismatch. Expected ${expectedVersion} but found ${actualVersion}.`,
			},
		);
	}

	/**
	 * Creates a DependencyError for unresolved task dependencies
	 */
	static unresolvedTaskDependency(
		taskName: string,
		dependencyName: string,
		packageName?: string,
	): DependencyError {
		return new DependencyError(
			`Unresolved task dependency '${dependencyName}' for task '${taskName}'`,
			{ packageName, taskName },
			{
				userMessage: `Task '${taskName}' depends on '${dependencyName}' which could not be resolved.`,
			},
		);
	}
}
