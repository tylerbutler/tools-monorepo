/**
 * Checks if a given function is a generator function.
 *
 * A generator function is a function that can be paused and resumed, and can yield
 * multiple values over time. This utility function helps identify such functions
 * by checking their constructor name.
 *
 * @param fn - The function to check
 * @returns `true` if the function is a generator function, `false` otherwise
 *
 * @example
 * ```typescript
 * function* myGenerator() {
 *   yield 1;
 *   yield 2;
 * }
 *
 * function regularFunction() {
 *   return 1;
 * }
 *
 * console.log(isGeneratorFunction(myGenerator)); // true
 * console.log(isGeneratorFunction(regularFunction)); // false
 * ```
 *
 * @alpha
 */
// biome-ignore lint/complexity/noBannedTypes: broad type is OK here
export function isGeneratorFunction(fn: Function): fn is GeneratorFunction {
	return fn.constructor.name === "GeneratorFunction";
}
