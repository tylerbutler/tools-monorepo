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
 * A PolicyCreator is a function that can be used to generate a {@link PolicyDefinition}. The function can be a free function
 * or a constructor that creates a class implementing the {@link PolicyDefinition} interface.
 *
 * @alpha
 */
export type PolicyCreator = PolicyCreatorConstructor | PolicyCreatorFunction;
