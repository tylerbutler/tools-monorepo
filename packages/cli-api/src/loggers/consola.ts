import { createConsola, LogLevels } from "consola";
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
 * A {@link Logger} with rich formatting using the consola library.
 *
 * @remarks
 * ConsolaLogger provides enhanced visual output with icons and colors.
 * Requires the `consola` peer dependency to be installed.
 *
 * Installation:
 * ```bash
 * pnpm add consola
 * ```
 *
 * Output format:
 * ```
 * ✔ Build completed successfully
 * ℹ Processing 5 files
 * ⚠ Config file not found, using defaults
 * ✖ Failed to read package.json
 * ```
 *
 * @example
 * ```typescript
 * import { ConsolaLogger } from "@tylerbu/cli-api/loggers/consola.js";
 *
 * export default class MyCommand extends BaseCommand<typeof MyCommand> {
 *   protected override _logger = ConsolaLogger;
 * }
 * ```
 *
 * @alpha
 */
export const ConsolaLogger: Logger = {
	log: consola.log,
	success: consola.success,
	info: consola.info,
	warning: consola.warn,
	error: consola.error,
	verbose: consola.verbose,
} as const;
