import { run } from "effection";
import type {
	PolicyFunctionArguments,
	PolicyHandler,
	PolicyHandlerResult,
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
export async function runHandler<C = undefined>(
	handler: PolicyHandler<C>,
	args: PolicyFunctionArguments<C>,
): Promise<PolicyHandlerResult> {
	const result = handler(args);

	// Handle Promise return type
	if (result instanceof Promise) {
		return result;
	}

	// Handle Effection Operation (generator) return type
	if (isOperation<PolicyHandlerResult>(result)) {
		return run(() => result);
	}

	throw new Error(`Unexpected handler result type: ${typeof result}`);
}
