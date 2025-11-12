import { LogLevels, createConsola } from "consola";
import type { Logger } from "../logger.js";

const consola = createConsola({
	level: LogLevels.info,
	fancy: true,
	formatOptions: {
		// columns: 80,
		colors: true,
		compact: false,
		date: false,
	},
});

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
