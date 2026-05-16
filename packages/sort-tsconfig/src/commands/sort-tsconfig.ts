import { existsSync, statSync } from "node:fs";
import { Args, type Command, Flags } from "@oclif/core";
import { CommandWithConfig, ConfigFlag } from "@tylerbu/cli-api";
import { join } from "pathe";
import { glob } from "tinyglobby";
import { TsConfigSorter } from "../api.js";
import type { SortTsconfigConfiguration } from "../config.js";
import { defaultSortOrder, type OrderList } from "../orders.js";

export default class SortTsconfigCommand extends CommandWithConfig<
	typeof SortTsconfigCommand,
	SortTsconfigConfiguration
> {
	public static override readonly aliases = [
		"sort:tsconfigs",
		"sort-tsconfigs",
	];

	public static override readonly summary =
		"Sorts a tsconfig file in place or checks that one is sorted.";

	public static override readonly description =
		"By default, the command will only check if a tsconfig is sorted. Use the '--write' flag to write the sorted contents back to the file.";

	public static override readonly args = {
		tsconfig: Args.custom<string[]>({
			description:
				"A path to the tsconfig file to sort, or a glob pattern to select multiple tsconfigs. The node_modules folder is always excluded from glob matches.",
			required: true,
			parse: async (input): Promise<string[]> => {
				const patterns: string[] = [];
				if (existsSync(input)) {
					const stats = statSync(input);
					if (stats.isDirectory()) {
						patterns.push(join(input, "tsconfig.json"));
					} else {
						patterns.push(input);
					}
				} else {
					patterns.push(input);
				}

				const results = await glob(patterns, {
					ignore: ["**/node_modules/**"],
				});
				return results ?? [];
			},
		})(),
		...CommandWithConfig.args,
	};

	public static override readonly flags = {
		write: Flags.boolean({
			char: "w",
			description:
				"Write the sorted contents back to the file. Without this flag, the command only checks that the file is sorted.",
			default: false,
		}),
		...CommandWithConfig.flags,
		config: ConfigFlag,
	} as const;

	public static override readonly examples: Command.Example[] = [
		{
			description:
				"Check if the tsconfig.json file in the current working directory is sorted.",
			command: "<%= config.bin %> <%= command.id %> .",
		},
		{
			description:
				"Sort the tsconfig.json file in the current working directory.",
			command: "<%= config.bin %> <%= command.id %> . --write",
		},
		{
			description: "Sort all tsconfig.json files under the packages directory.",
			command:
				"<%= config.bin %> <%= command.id %> 'packages/**/tsconfig.json' --write",
		},
	];

	protected override defaultConfig: SortTsconfigConfiguration | undefined = {
		order: defaultSortOrder,
	};

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: should clean this up at some point.
	public override async run(): Promise<void> {
		const { tsconfig: tsconfigs } = this.args;
		const { write } = this.flags;

		if (tsconfigs === undefined) {
			this.exit("No path or glob to tsconfigs provided.");
		}

		if (tsconfigs.length === 0) {
			this.exit("No files found matching arguments");
		}

		let orderToUse: OrderList;
		const config = this.commandConfig;
		if (config === undefined) {
			this.warning("No config file found; using default sort order.");
			orderToUse = defaultSortOrder;
		} else if (config.order === undefined) {
			this.warning("No order in config; using default sort order.");
			orderToUse = defaultSortOrder;
		} else {
			orderToUse = config.order;
		}

		const sorter = new TsConfigSorter(orderToUse);

		const unsortedFiles: string[] = [];

		for (const tsconfig of tsconfigs) {
			if (write) {
				const result = sorter.sortTsconfigFile(tsconfig, write);
				this.log(
					result.alreadySorted
						? `File already sorted: ${tsconfig}`
						: `Wrote sorted file: ${tsconfig}`,
				);
			} else {
				const sorted = sorter.isSorted(tsconfig);
				if (!sorted) {
					unsortedFiles.push(tsconfig);
					this.logError(`Not sorted! ${tsconfig}`);
				}
			}
		}

		if (unsortedFiles.length > 0) {
			this.exit(`Found ${unsortedFiles.length} unsorted files.`, 1);
		}
		this.log("All files sorted.");
	}
}
