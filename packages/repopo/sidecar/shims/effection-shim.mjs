/**
 * Effection shim for QuickJS runtime.
 *
 * Provides minimal `call()` and `run()` for the generator patterns used by
 * repopo policies. Since all fs operations resolve synchronously (Rust std::fs
 * backing), Promises in the chain resolve immediately when the event loop is
 * pumped.
 *
 * Policies use two patterns:
 *   1. yield* call(() => someAsyncFn()) - wraps an async call as a generator
 *   2. function*() { ... } - generator-based handlers
 */

/**
 * Wraps an async function call as a generator Operation.
 * When yield*'d, calls the function, and if the result is a Promise,
 * yields it up to the runner which awaits it.
 */
export function* call(fn) {
	const result = fn();
	if (result && typeof result.then === "function") {
		return yield result;
	}
	return result;
}

/**
 * Run an Operation (generator or generator function) to completion.
 * Pumps the generator, awaiting any yielded Promises.
 */
export async function run(opOrFn) {
	const gen = typeof opOrFn === "function" ? opOrFn() : opOrFn;
	let next = gen.next();
	while (!next.done) {
		let value = next.value;
		if (value && typeof value.then === "function") {
			try {
				value = await value;
			} catch (err) {
				next = gen.throw(err);
				continue;
			}
		}
		next = gen.next(value);
	}
	return next.value;
}

/**
 * No-op sleep for sync context.
 */
export function* sleep(_ms) {
	// Immediate return - no actual delay in sync QuickJS context
}

/**
 * Spawn stub - runs operation inline.
 */
export function spawn(op) {
	return call(() => run(op));
}

/**
 * Action stub - wraps function as operation.
 */
export function action(fn) {
	return call(fn);
}

export default { call, run, sleep, spawn, action };
