/**
 * Expected command execution result
 */
export interface CommandExpectation {
	command: string;
	exitCode: number;
	stdout?: string;
	stderr?: string;
	duration?: number;
}

/**
 * Recorded command execution
 */
export interface CommandCall {
	command: string;
	timestamp: number;
}

/**
 * Command execution result
 */
export interface CommandResult {
	exitCode: number;
	stdout: string;
	stderr: string;
	duration?: number;
}

/**
 * Mock command runner for testing command execution without actual process spawning.
 *
 * Allows tests to define expected command invocations and their results,
 * then verify that commands were called as expected.
 *
 * @example
 * ```typescript
 * const mockRunner = new MockCommandRunner()
 *   .expectCommand("tsc", 0, "Compilation successful")
 *   .expectCommand("biome check", 1, "", "Found 3 errors");
 *
 * const result1 = await mockRunner.execute("tsc");
 * expect(result1.exitCode).toBe(0);
 * expect(result1.stdout).toBe("Compilation successful");
 *
 * const result2 = await mockRunner.execute("biome check");
 * expect(result2.exitCode).toBe(1);
 * expect(result2.stderr).toBe("Found 3 errors");
 *
 * mockRunner.verify(); // Ensures all expected commands were called
 * ```
 */
export class MockCommandRunner {
	private expectations: CommandExpectation[] = [];
	private calls: CommandCall[] = [];
	private strict = true;

	/**
	 * Add an expected command execution
	 *
	 * @param command - Command string to expect
	 * @param exitCode - Exit code to return (0 = success, non-zero = failure)
	 * @param stdout - Standard output to return
	 * @param stderr - Standard error to return
	 * @param duration - Simulated execution duration in milliseconds
	 */
	expectCommand(
		command: string,
		exitCode: number,
		stdout = "",
		stderr = "",
		duration?: number,
	): this {
		this.expectations.push({
			command,
			exitCode,
			stdout,
			stderr,
			duration,
		});
		return this;
	}

	/**
	 * Add multiple expected commands at once
	 */
	expectCommands(expectations: CommandExpectation[]): this {
		this.expectations.push(...expectations);
		return this;
	}

	/**
	 * Set whether to enforce strict command matching
	 *
	 * In strict mode (default), commands must match expectations exactly.
	 * In non-strict mode, unexpected commands return success (exit code 0).
	 */
	setStrict(strict: boolean): this {
		this.strict = strict;
		return this;
	}

	/**
	 * Execute a command (simulated)
	 *
	 * Returns the result from the next expectation, or throws if no expectation matches.
	 */
	async execute(command: string): Promise<CommandResult> {
		this.calls.push({
			command,
			timestamp: Date.now(),
		});

		const expectation = this.expectations.shift();

		if (!expectation) {
			if (this.strict) {
				throw new Error(
					`Unexpected command executed: "${command}"\n` +
						"No expectations remaining. Did you forget to call expectCommand()?",
				);
			}
			// Non-strict mode: return success for unexpected commands
			return {
				exitCode: 0,
				stdout: "",
				stderr: "",
			};
		}

		if (this.strict && expectation.command !== command) {
			throw new Error(
				"Command mismatch!\n" +
					`  Expected: "${expectation.command}"\n` +
					`  Received: "${command}"`,
			);
		}

		// Simulate execution duration if specified
		if (expectation.duration) {
			await new Promise((resolve) => setTimeout(resolve, expectation.duration));
		}

		return {
			exitCode: expectation.exitCode,
			stdout: expectation.stdout ?? "",
			stderr: expectation.stderr ?? "",
			duration: expectation.duration,
		};
	}

	/**
	 * Verify that all expected commands were called
	 *
	 * Throws an error if there are remaining expectations that weren't executed.
	 */
	verify(): void {
		if (this.expectations.length > 0) {
			const remaining = this.expectations.map((e) => e.command).join(", ");
			throw new Error(
				"Not all expected commands were executed.\n" +
					`Remaining expectations: [${remaining}]`,
			);
		}
	}

	/**
	 * Get the list of all commands that were executed
	 */
	getCalls(): readonly CommandCall[] {
		return [...this.calls];
	}

	/**
	 * Get the number of commands executed
	 */
	getCallCount(): number {
		return this.calls.length;
	}

	/**
	 * Check if a specific command was called
	 */
	wasCommandCalled(command: string): boolean {
		return this.calls.some((call) => call.command === command);
	}

	/**
	 * Get the number of times a specific command was called
	 */
	getCommandCallCount(command: string): number {
		return this.calls.filter((call) => call.command === command).length;
	}

	/**
	 * Reset the mock (clear calls and expectations)
	 */
	reset(): this {
		this.calls = [];
		this.expectations = [];
		return this;
	}

	/**
	 * Clear only the calls (keep expectations)
	 */
	clearCalls(): this {
		this.calls = [];
		return this;
	}

	/**
	 * Clear only the expectations (keep calls)
	 */
	clearExpectations(): this {
		this.expectations = [];
		return this;
	}
}
