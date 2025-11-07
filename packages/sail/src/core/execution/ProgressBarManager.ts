import logUpdate from "log-update";

/**
 * Manages progress bar display coordinated with console output to prevent visual artifacts.
 *
 * The progress bar uses log-update to continuously overwrite the same terminal line.
 * When console output occurs (via console.log/console.error), we need to temporarily
 * clear the progress bar, print the output, then redraw the progress bar to prevent ghost lines.
 *
 * This is achieved by monkey-patching console.log and console.error during progress display.
 */
export class ProgressBarManager {
	private currentMessage = "";
	private isActive = false;
	private originalConsoleLog?: typeof console.log;
	private originalConsoleError?: typeof console.error;

	/**
	 * Starts the progress bar display and patches console methods.
	 */
	public start(): void {
		this.isActive = true;
		this.patchConsoleMethods();
	}

	/**
	 * Updates the progress bar with a new message.
	 * Only displays if the progress bar is active.
	 */
	public update(message: string): void {
		if (!this.isActive) {
			return;
		}

		this.currentMessage = message;
		logUpdate(message);
	}

	/**
	 * Finalizes the progress bar, persisting the final state and restoring console methods.
	 */
	public done(): void {
		if (!this.isActive) {
			return;
		}

		this.isActive = false;
		logUpdate.done();
		this.restoreConsoleMethods();
	}

	/**
	 * Clears the progress bar from the terminal and restores console methods.
	 */
	public clear(): void {
		if (!this.isActive) {
			return;
		}

		this.isActive = false;
		logUpdate.clear();
		this.currentMessage = "";
		this.restoreConsoleMethods();
	}

	/**
	 * Patches console.log and console.error to coordinate with the progress bar.
	 * When logging occurs, the progress bar is temporarily cleared, output is printed,
	 * then the progress bar is redrawn.
	 */
	private patchConsoleMethods(): void {
		// Save original methods
		// biome-ignore lint/suspicious/noConsole: intentionally patching console for progress coordination
		this.originalConsoleLog = console.log;
		// biome-ignore lint/suspicious/noConsole: intentionally patching console for progress coordination
		this.originalConsoleError = console.error;

		// Wrap console.log
		console.log = (...args: unknown[]): void => {
			if (this.isActive) {
				// Clear the progress bar
				logUpdate.clear();

				// Call the original console.log
				this.originalConsoleLog?.(...args);

				// Redraw the progress bar
				if (this.currentMessage) {
					logUpdate(this.currentMessage);
				}
			} else {
				this.originalConsoleLog?.(...args);
			}
		};

		// Wrap console.error
		console.error = (...args: unknown[]): void => {
			if (this.isActive) {
				// Clear the progress bar
				logUpdate.clear();

				// Call the original console.error
				this.originalConsoleError?.(...args);

				// Redraw the progress bar
				if (this.currentMessage) {
					logUpdate(this.currentMessage);
				}
			} else {
				this.originalConsoleError?.(...args);
			}
		};
	}

	/**
	 * Restores the original console.log and console.error methods.
	 */
	private restoreConsoleMethods(): void {
		if (this.originalConsoleLog) {
			console.log = this.originalConsoleLog;
			this.originalConsoleLog = undefined;
		}

		if (this.originalConsoleError) {
			console.error = this.originalConsoleError;
			this.originalConsoleError = undefined;
		}
	}
}
