/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import { defaultLogger } from "./logging.js";
/**
 * A stopwatch used for outputting messages to the terminal along with timestamp information.
 * The stopwatch is started upon creation, and each call to `log` will include the recorded time.
 */
export class Stopwatch {
    enabled;
    logFunc;
    lastTime = Date.now();
    totalTime = 0;
    constructor(enabled, logFunc = defaultLogger.log) {
        this.enabled = enabled;
        this.logFunc = logFunc;
    }
    log(msg, print) {
        const currTime = Date.now();
        const diffTime = currTime - this.lastTime;
        this.lastTime = currTime;
        const diffTimeInSeconds = diffTime / 1000;
        if (msg !== undefined) {
            if (this.enabled) {
                if (diffTime > 100) {
                    this.logFunc(`${msg} - ${diffTimeInSeconds.toFixed(3)}s`);
                }
                else {
                    this.logFunc(`${msg} - ${diffTime}ms`);
                }
            }
            else if (print === true) {
                this.logFunc(msg);
            }
        }
        this.totalTime += diffTime;
        return diffTimeInSeconds;
    }
    getTotalTime() {
        return this.totalTime;
    }
}
//# sourceMappingURL=stopwatch.js.map