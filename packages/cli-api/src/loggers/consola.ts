import { consola } from "consola";
import type { Logger } from "../logger.js";
// import { BasicLogger } from "./basic.js";

// const consolaLogger = createConsola({ level: LogLevels.info });

/**
 * A logger that logs using the consola default colorful logger.
 *
 * @alpha
 */
export const ConsolaLogger: Logger = {
	log: consola.log,
	success: consola.success,
	info: consola.info,
	warning: consola.warn,
	errorLog: consola.error,
	verbose: consola.verbose,
} as const;
