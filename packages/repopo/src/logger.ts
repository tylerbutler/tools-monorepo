/**
 * Code in this file is inspired by https://github.com/pigeonposse/bepp
 */
import { Spinner } from "@topcli/spinner";
import type { Logger } from "@tylerbu/cli-api";
import chalk from "picocolors";

export type SpinnerFunct = ReturnType<SpinLogger["spinner"]>;

export class SpinLogger {
	public constructor(private log: Logger) {}

	verbose = false;

	spinner(withPrefix: string) {
		const instance = new Spinner({
			name: "line",
		});

		return {
			start: (txt: string) => {
				if (this.verbose) {
					this.info(txt);
				} else {
					instance.start(txt, {
						withPrefix: `${chalk.blue(withPrefix)} - `,
					});
				}
			},
			changeText: (txt: string) => {
				if (this.verbose) {
					this.info(txt);
				} else {
					instance.text = txt;
				}
			},
			getTime: () => instance.elapsedTime.toFixed(2),
			succeed: (txt: string) => {
				if (this.verbose) {
					this.info(txt);
				} else {
					instance.succeed(chalk.green(txt));
				}
			},
			failed: (txt: string) => {
				if (this.verbose) {
					this.error(txt);
				} else {
					instance.failed(chalk.red(txt));
				}
			},
			reset: () => Spinner.reset(),
			verbose: (data: string | object) => this.info(data),
			// verboseError: (data: string | object) => this.fatal(data),
		};
	}

	time() {
		let start: number | undefined;
		let stop: number | undefined;

		return {
			start: () => {
				start = performance.now();
			},
			stop: () => {
				stop = performance.now();
			},
			getResult: () => {
				if (start && stop) {
					return stop - start;
				}
				return false;
			},
		};
	}
	// forceInfo(data: string | object) {
	// 	this.log.info(data);
	// }
	info(data: string | object) {
		if (this.verbose) {
			this.log.info(typeof data === "string" ? data : JSON.stringify(data));
		}
	}
	error(data: string | object) {
		this.log.errorLog(typeof data === "string" ? data : JSON.stringify(data));
	}
	warn(data: string | object) {
		if (this.verbose) {
			this.log.warning(typeof data === "string" ? data : JSON.stringify(data));
		}
	}
	debug(data: string | object) {
		if (this.verbose) {
      this.log.verbose(typeof data === "string" ? data : JSON.stringify(data));
    };
	}
	// fatal(data: string | object) {
	// 	this.log.fatal(data);
	// 	process.exit(1);
	// }
}
