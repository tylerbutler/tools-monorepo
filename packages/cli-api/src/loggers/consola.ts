import { consola } from "consola";
import type { Logger } from "../logger.js";
import { basicLogger } from "./basic.js";

// const consolaLogger = createConsola({ level: LogLevels.info });

/**
 * A logger that logs using the consola default colorful logger.
 */
export const consolaLogger: Logger = {
	log: consola.log,
	info: consola.info,
	warning: consola.warn,
	errorLog: consola.error,
	verbose: consola.verbose,
	formatError: basicLogger.formatError,
};
