import { run } from "effection";
import type {
	PolicyFunctionArguments,
	PolicyHandler,
	PolicyHandlerResult,
	RepositoryPolicyArgs,
	RepositoryPolicyHandler,
	RepositoryPolicyResult,
} from "../src/policy.js";

/**
 * Type guard to check if a value is an Effection Operation (generator).
 */
function isOperation<T>(
	value: unknown,
): value is Generator<unknown, T, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		"next" in value &&
		typeof (value as { next: unknown }).next === "function"
	);
}

/**
 * Execute a policy handler and return the result.
 *
 * This helper handles both async handlers (returning Promise) and
 * Effection generators (returning Operation). Use this in tests
 * instead of directly calling the handler.
 */
export function runHandler<C = undefined>(
	handler: RepositoryPolicyHandler<C>,
	args: RepositoryPolicyArgs<C>,
): Promise<RepositoryPolicyResult>;
export function runHandler<C = undefined>(
	handler: PolicyHandler<C>,
	args: PolicyFunctionArguments<C>,
): Promise<PolicyHandlerResult>;
export async function runHandler<A, R>(
	handler: (handlerArgs: A) => Promise<R> | Generator<unknown, R, unknown>,
	args: A,
): Promise<R> {
	const result = handler(args);

	// Handle Promise return type
	if (result instanceof Promise) {
		return result;
	}

	// Handle Effection Operation (generator) return type
	if (isOperation<R>(result)) {
		return run(() => result);
	}

	throw new Error(`Unexpected handler result type: ${typeof result}`);
}
