import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "@tylerbu/cli-api";
import type { DillOptions } from "../api.js";
import { download } from "../api.js";

export default class DownloadCommand extends BaseCommand<
	typeof DownloadCommand
> {
	static override readonly description =
		"Downloads a file from a URL and optionally extracts its contents.";

	static override readonly args = {
		url: Args.url({
			description: "URL of the file to download.",
			required: true,
		}),
	};

	static override readonly flags = {
		extract: Flags.boolean({
			description:
				"Decompress the file and, if it's a tarball, extract its contents.",
			char: "e",
		}),
		out: Flags.directory({
			description: "Directory in which to place the downloaded files.",
			char: "o",
		}),
		// TODO: Add this flag once testing is in better shape.
		// strip: Flags.integer({
		// 	description:
		// 		"Strip leading paths from file names during extraction. Only works with --extract.",
		// 	char: "s",
		// 	min: 0,
		// 	dependsOn: ["extract"],
		// }),
		filename: Flags.file({
			description:
				"Name to use for the downloaded file. Cannot be used with --extract.",
			exclusive: ["extract"],
		}),
		...BaseCommand.flags,
	};

	// static override readonly examples = ["<%= config.bin %> <%= command.id %>"];

	public async run(): Promise<void> {
		const { url } = this.args;
		const { extract, out, filename } = this.flags;

		this.log("Download command invoked!");

		const options: DillOptions = {
			extract,
			downloadDir: out ?? ".",
			filename,
		};

		await download(url, options);
	}
}

export { download };
export type { DillOptions };
