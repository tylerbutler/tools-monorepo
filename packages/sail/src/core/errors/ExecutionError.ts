import {
	ErrorCategory,
	type ErrorContext,
	SailError,
	type SailErrorOptions,
} from "./SailError.js";

/**
 * Error thrown when there are issues executing commands or tasks
 */
export class ExecutionError extends SailError {
	public readonly exitCode?: number;
	public readonly stdout?: string;
	public readonly stderr?: string;

	public constructor(
		message: string,
		context: ErrorContext = {},
		options: ExecutionErrorOptions = {},
	) {
		super(message, ErrorCategory.Execution, context, options);
		this.exitCode = options.exitCode;
		this.stdout = options.stdout;
		this.stderr = options.stderr;
	}

	/**
	 * Creates an ExecutionError for command execution failures
	 */
	public static commandFailed(
		command: string,
		exitCode?: number,
		stderr?: string,
		stdout?: string,
		context: ErrorContext = {},
	): ExecutionError {
		const codeStr = exitCode !== undefined ? ` (exit code ${exitCode})` : "";
		const message = `Command failed: ${command}${codeStr}`;

		return new ExecutionError(
			message,
			{ ...context, command },
			{
				exitCode,
				stdout,
				stderr,
				isRetryable: exitCode !== 0 && exitCode !== 1, // Some exit codes might be retryable
				userMessage: `Command '${command}' failed${codeStr}. Check the output for details.`,
			},
		);
	}

	/**
	 * Creates an ExecutionError for timeout situations
	 */
	public static timeout(
		command: string,
		timeoutMs: number,
		context: ErrorContext = {},
	): ExecutionError {
		return new ExecutionError(
			`Command timed out after ${timeoutMs}ms: ${command}`,
			{ ...context, command },
			{
				isRetryable: true,
				userMessage: `Command '${command}' timed out after ${timeoutMs / 1000} seconds. You may want to increase the timeout or check if the command is stuck.`,
			},
		);
	}

	/**
	 * Creates an ExecutionError for invalid commands
	 */
	public static invalidCommand(
		command: string,
		reason: string,
		context: ErrorContext = {},
	): ExecutionError {
		return new ExecutionError(
			`Invalid command '${command}': ${reason}`,
			{ ...context, command },
			{
				userMessage: `Command '${command}' is invalid: ${reason}`,
			},
		);
	}

	/**
	 * Creates an ExecutionError for worker execution failures
	 */
	public static workerFailed(
		workerName: string,
		error: Error,
		context: ErrorContext = {},
	): ExecutionError {
		return new ExecutionError(
			`Worker '${workerName}' failed: ${error.message}`,
			{ ...context, workerId: workerName },
			{
				isRetryable: true,
				userMessage: `Worker process '${workerName}' encountered an error. The task will be retried on the main thread.`,
			},
		);
	}

	/**
	 * Returns detailed execution information for debugging
	 */
	public getExecutionDetails(): string {
		const details: string[] = [];

		if (this.context.command) {
			details.push(`Command: ${this.context.command}`);
		}

		if (this.exitCode !== undefined) {
			details.push(`Exit Code: ${this.exitCode}`);
		}

		if (this.stderr) {
			details.push(`Stderr: ${this.stderr}`);
		}

		if (this.stdout) {
			details.push(`Stdout: ${this.stdout}`);
		}

		return details.join("\n");
	}

	/**
	 * Converts to JSON with execution-specific fields
	 */
	public override toJSON() {
		return {
			...super.toJSON(),
			exitCode: this.exitCode,
			stdout: this.stdout,
			stderr: this.stderr,
		};
	}
}

/**
 * Options specific to ExecutionError
 */
export interface ExecutionErrorOptions extends SailErrorOptions {
	exitCode?: number;
	stdout?: string;
	stderr?: string;
}
