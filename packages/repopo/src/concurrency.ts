export const DEFAULT_CONCURRENCY = 8;

export function validateConcurrency(concurrency: number): number {
	if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
		throw new Error("Concurrency must be a positive safe integer.");
	}
	return concurrency;
}
