/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * A stopwatch used for outputting messages to the terminal along with timestamp information.
 * The stopwatch is started upon creation, and each call to `log` will include the recorded time.
 */
export declare class Stopwatch {
    private readonly enabled;
    protected logFunc: import("./logging.js").LoggingFunction;
    private lastTime;
    private totalTime;
    constructor(enabled: boolean, logFunc?: import("./logging.js").LoggingFunction);
    log(msg?: string, print?: boolean): number;
    getTotalTime(): number;
}
//# sourceMappingURL=stopwatch.d.ts.map