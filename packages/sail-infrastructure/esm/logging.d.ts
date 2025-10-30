/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * A function that logs an Error or error message.
 */
export type ErrorLoggingFunction = (msg: string | Error | undefined, ...args: any[]) => void;
/**
 * A function that logs an error message.
 */
export type LoggingFunction = (message?: string, ...args: any[]) => void;
/**
 * A general-purpose logger object.
 *
 * @remarks
 *
 * The `log` method is the primary logging function. The other functions can be used to support logging at different
 * levels. Methods other than `log` may modify the error message in some way (e.g. by prepending some text to it).
 */
export interface Logger {
    /**
     * Logs an error message as-is.
     */
    log: LoggingFunction;
    /**
     * Logs an informational message.
     */
    info: ErrorLoggingFunction;
    /**
     * Logs a warning message.
     */
    warning: ErrorLoggingFunction;
    /**
     * Logs an error message.
     *
     * @remarks
     *
     * This method is not named 'error' because it conflicts with the method that oclif has on its Command class.
     * That method exits the process in addition to logging, so this method exists to differentiate, and provide
     * error logging that doesn't exit the process.
     */
    errorLog: ErrorLoggingFunction;
    /**
     * Logs a verbose message.
     */
    verbose: ErrorLoggingFunction;
}
/**
 * A {@link Logger} that logs directly to the console.
 */
export declare const defaultLogger: Logger;
//# sourceMappingURL=logging.d.ts.map