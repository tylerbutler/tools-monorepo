import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { Args, Flags } from "@oclif/core";
import { BaseCommand, isSorted, sortTsconfigFile } from "@tylerbu/cli-api";
import { globby } from "globby";

export default class SortTsconfig extends BaseCommand<typeof SortTsconfig> {
	static override readonly aliases = ["sort:tsconfigs"];

	static override readonly summary =
		"Sorts a tsconfig file in place, or check that one is sorted.";

	static override readonly description =
		"By default, the command will only check if a tsconfig is sorted. Use the --write flag to write the sorted contents back to the file.";

	static override readonly args = {
		tsconfig: Args.custom<string[]>({
			description:
				"Path to the tsconfig file to sort, or a glob path to select multiple tsconfigs.",
			required: true,
			parse: async (input) => {
				const patterns: string[] = [];
				if (existsSync(input)) {
					const stats = statSync(input);
					if (stats.isDirectory()) {
						patterns.push(path.join(input, "tsconfig.json"));
					}
				} else {
					patterns.push(input);
				}

				const results = await globby(patterns, { gitignore: true });
				return results ?? [];
			},
		})(),
	};

	static override readonly flags = {
		write: Flags.boolean({
			description:
				"Write the sorted contents back to the file. Without this flag, the command only checks that the file is sorted.",
			default: false,
		}),
		...BaseCommand.flags,
	};

	// biome-ignore lint/suspicious/useAwait: inherited method
	async run(): Promise<void> {
		const { tsconfig: tsconfigs } = this.args;
		const { write } = this.flags;

		if (tsconfigs === undefined) {
			this.error("No path or glob to tsconfigs provided.");
		}

		if (tsconfigs.length === 0) {
			this.error("No files found matching arguments");
		}

		const unsortedFiles: string[] = [];

		for (const tsconfig of tsconfigs) {
			if (write) {
				const result = sortTsconfigFile(tsconfig, write);
				this.log(
					result.alreadySorted
						? `File already sorted: ${tsconfig}`
						: `Wrote sorted file: ${tsconfig}`,
				);
			} else {
				const sorted = isSorted(tsconfig);
				if (!sorted) {
					unsortedFiles.push(tsconfig);
					this.errorLog(`Not sorted! ${tsconfig}`);
				}
			}
		}

		if (unsortedFiles.length > 0) {
			this.error(`Found ${unsortedFiles.length} unsorted files.`, {
				exit: 1,
			});
		}
	}
}
