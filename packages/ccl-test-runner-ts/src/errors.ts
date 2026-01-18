/**
 * Error thrown when a CCL function is not yet implemented.
 */
export class NotYetImplementedError extends Error {
	public readonly functionName: string;

	public constructor(functionName: string) {
		super(`CCL function '${functionName}' is not yet implemented`);
		this.name = "NotYetImplementedError";
		this.functionName = functionName;
	}
}
