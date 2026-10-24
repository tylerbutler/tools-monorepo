import type { Logger } from "@tylerbu/cli-api";
import type { Operation } from "effection";
import type { PolicyInstanceId } from "./policy.js";

/**
 * The type of action a policy can perform.
 * @public
 */
export type PolicyAction = "check" | "resolve" | "handle";

/**
 * Stores performance data for each handler. Used to collect and display performance stats.
 * @public
 */
export interface PolicyHandlerPerfStats {
	/** Number of candidate file paths supplied to the runner. */
	count: number;
	/** Number of candidate files admitted past global exclusions. */
	processed: number;
	/** Total elapsed milliseconds per action and configured policy instance. */
	data: Map<PolicyAction, Map<PolicyInstanceId, number>>;
}

export function newPerfStats(): PolicyHandlerPerfStats {
	return {
		count: 0,
		processed: 0,
		data: new Map<PolicyAction, Map<PolicyInstanceId, number>>(),
	};
}

export function* runWithPerf<T>(
	name: string,
	action: PolicyAction,
	stats: PolicyHandlerPerfStats,
	run: () => Operation<T>,
): Operation<T> {
	const start = performance.now();
	try {
		return yield* run();
	} finally {
		const actionMap = stats.data.get(action) ?? new Map<string, number>();
		actionMap.set(name, (actionMap.get(name) ?? 0) + performance.now() - start);
		stats.data.set(action, actionMap);
	}
}

export function logStats(stats: PolicyHandlerPerfStats, log: Logger): void {
	log.log(
		`Statistics: ${stats.processed} files processed, ` +
			`${stats.count - stats.processed} excluded, ${stats.count} total`,
	);
	for (const [action, handlerPerf] of stats.data.entries()) {
		log.log(`Performance for "${action}":`);
		for (const [handler, dur] of handlerPerf.entries()) {
			log.log(`    ${handler}: ${Math.round(dur * 10) / 10}ms`);
		}
	}
}
