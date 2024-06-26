import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "@tylerbu/cli-api";
import type { DillOptions } from "../api.js";
import { download } from "../api.js";

export default class DownloadCommand extends BaseCommand<
	typeof DownloadCommand
> {
	static override readonly aliases = ["dl", "dill"];
	static override readonly description =
		"Downloads a file from a URL and optionally extracts its contents.";

	static override readonly args = {
		url: Args.url({ description: "URL of the file to download." }),
	};

	static override readonly flags = {
		extract: Flags.boolean({
			description: "Decompress the file and extract its contents.",
			char: "e",
		}),
		out: Flags.directory({
			description: "Directory in which to place the downloaded files.",
			char: "o",
		}),
		strip: Flags.integer({
			description: "Strip leading paths from file names during extraction.",
			char: "s",
			min: 0,
			dependsOn: ["extract"],
		}),
		filename: Flags.file({
			description: "Name to use for the downloaded file.",
			exclusive: ["extract"],
		}),
		...BaseCommand.flags,
	};

	static override readonly examples = ["<%= config.bin %> <%= command.id %>"];

	// biome-ignore lint/suspicious/useAwait: not yet implemented
	public async run(): Promise<void> {
		// const { url } = this.args;
		// const { extract, out, strip, filename } = this.flags;

		this.error("Not yet implemented!");
	}
}

export { download };
export type { DillOptions };
