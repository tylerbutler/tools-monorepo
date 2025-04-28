import type { RepoPolicy } from "./policy.js";

/**
 * The definition of a free function that returns a RepoPolicy.
 */
export type PolicyCreatorFunction<C = undefined> = (
	args: RepoPolicy<C>,
) => RepoPolicy<C>;

/**
 * The definition of a constructor function that returns a RepoPolicy.
 */
export type PolicyCreatorConstructor<C = undefined> = new (
	args: RepoPolicy<C>,
) => RepoPolicy<C>;

/**
 * A PolicyCreator is a function that can be used to generate a {@link RepoPolicy}. The function can be a free function
 * or a constructor that creates a class implementing the {@link RepoPolicy} interface.
 */
export type PolicyCreator = PolicyCreatorConstructor | PolicyCreatorFunction;
