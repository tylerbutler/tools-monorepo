import type { LoggingFunction } from "@tylerbu/cli-api";
import type { PolicyName } from "./policy.js";

export type PolicyAction = "handle" | "resolve";

/**
 * Stores performance data for each handler. Used to collect and display performance stats.
 */
const handlerPerformanceData = new Map<PolicyAction, Map<PolicyName, number>>();

export interface PolicyHandlerPerfStats {
	count: number;
	processed: number;
	data: Map<PolicyAction, Map<PolicyName, number>>;
}

export function newPerfStats(): PolicyHandlerPerfStats {
	return {
		count: 0,
		processed: 0,
		data: new Map<PolicyAction, Map<PolicyName, number>>(),
	};
}

export async function runWithPerf<T>(
	name: string,
	action: PolicyAction,
	stats: PolicyHandlerPerfStats,
	run: () => Promise<T>,
): Promise<T> {
	const actionMap = stats.data.get(action) ?? new Map<string, number>();
	let dur = actionMap.get(name) ?? 0;

	const start = Date.now();
	const result = await run();
	dur += Date.now() - start;

	actionMap.set(name, dur);
	stats.data.set(action, actionMap);
	return result;
}

export function logStats(
	stats: PolicyHandlerPerfStats,
	log: LoggingFunction,
): void {
	log(
		`Statistics: ${stats.processed} processed, ${
			stats.count - stats.processed
		} excluded, ${stats.count} total`,
	);
	for (const [action, handlerPerf] of handlerPerformanceData.entries()) {
		log(`Performance for "${action}":`);
		for (const [handler, dur] of handlerPerf.entries()) {
			log(`\t${handler}: ${dur}ms`);
		}
	}
}
