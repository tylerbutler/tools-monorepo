/**
 * Known main executable names that can trigger recursive builds
 */
export const knownMainExecutableNames = new Set([
	"sail build",
	"sail b",
	"fluid-build",
]);

/**
 * Check if a script is a known main executable
 */
export function isKnownMainExecutable(script: string): boolean {
	return [...knownMainExecutableNames].some((name) =>
		script.startsWith(`${name} `),
	);
}
