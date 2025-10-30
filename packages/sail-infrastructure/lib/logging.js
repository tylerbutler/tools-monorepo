/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import chalk from "picocolors";
/**
 * A {@link Logger} that logs directly to the console.
 */
export const defaultLogger = {
    /**
     * {@inheritDoc Logger.log}
     */
    log,
    /**
     * {@inheritDoc Logger.info}
     */
    info,
    /**
     * {@inheritDoc Logger.warning}
     */
    warning,
    /**
     * {@inheritDoc Logger.errorLog}
     */
    errorLog,
    /**
     * {@inheritDoc Logger.verbose}
     */
    verbose,
};
function logWithTime(msg, logFunc) {
    const date = new Date();
    let hours = date.getHours().toString();
    if (hours.length === 1) {
        hours = `0${hours}`;
    }
    let mins = date.getMinutes().toString();
    if (mins.length === 1) {
        mins = `0${mins}`;
    }
    let secs = date.getSeconds().toString();
    if (secs.length === 1) {
        secs = `0${secs}`;
    }
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    logFunc(chalk.yellow(`[${hours}:${mins}:${secs}] `) + msg);
}
function log(msg) {
    logWithTime(msg, console.log);
}
function info(msg) {
    logWithTime(`INFO: ${msg}`, console.log);
}
function verbose(msg) {
    logWithTime(`VERBOSE: ${msg}`, console.log);
}
function warning(msg) {
    logWithTime(`${chalk.yellow(`WARNING`)}: ${msg}`, console.log);
}
function errorLog(msg) {
    logWithTime(`${chalk.red(`ERROR`)}: ${msg}`, console.error);
}
//# sourceMappingURL=logging.js.map