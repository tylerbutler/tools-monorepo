import type { PolicyDefinition } from "./policy.js";

/**
 * The definition of a free function that returns a RepoPolicy.
 *
 * @alpha
 */
export type PolicyCreatorFunction<C = undefined> = (
	args: PolicyDefinition<C>,
) => PolicyDefinition<C>;

/**
 * The definition of a constructor function that returns a RepoPolicy.
 *
 * @alpha
 */
export type PolicyCreatorConstructor<C = undefined> = new (
	args: PolicyDefinition<C>,
) => PolicyDefinition<C>;

/**
 * A PolicyCreator is a function that can be used to generate a {@link PolicyDefinition}. The function can be a free
 * function or a constructor that creates a class implementing the {@link PolicyDefinition} interface.
 *
 * @alpha
 */
export type PolicyCreator = PolicyCreatorConstructor | PolicyCreatorFunction;

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
