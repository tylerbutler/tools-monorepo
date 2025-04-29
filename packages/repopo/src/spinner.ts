import { Spinner } from "@topcli/spinner";
import type { PolicyHandlerResult } from "./policy.js";

export async function fnWithSpinner<T extends PolicyHandlerResult>(
	withPrefix: string,
	run: () => Promise<T>,
) {
	const spinner = new Spinner().start("Start working!", { withPrefix });

	spinner.text = "Work in progress...";
	const result = await run();

	if (result === true) {
		spinner.succeed(`All done in ${spinner.elapsedTime.toFixed(2)}ms !`);
	} else {
		spinner.failed("Something wrong happened !");
	}
	return result;
}
