import { call, type Operation } from "effection";

/** Keep arbitrary rejected values out of Effection's error normalization. */
export function* settlePolicyPromise<T>(promise: Promise<T>): Operation<T> {
	const settled = yield* call(() =>
		promise.then(
			(value) => ({ ok: true, value }) as const,
			(cause: unknown) => ({ ok: false, cause }) as const,
		),
	);
	if (!settled.ok) {
		throw settled.cause;
	}
	return settled.value;
}
