import process from "node:process";
import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "@tylerbu/cli-api";
import { download } from "../api.js";
import type { DillOptions, DownloadResponse } from "../types.js";

export default class DownloadCommand extends BaseCommand<
	typeof DownloadCommand
> {
	public static override readonly description =
		"Downloads a file from a URL and optionally extracts its contents.";

	public static override readonly args = {
		url: Args.url({
			description: "URL of the file to download.",
			required: true,
		}),
	};

	public static override readonly flags = {
		extract: Flags.boolean({
			description:
				"Decompress the file and, if it's a tarball, extract its contents.",
			char: "e",
		}),
		out: Flags.directory({
			description: "Directory in which to place the downloaded files.",
			char: "o",
		}),
		filename: Flags.file({
			description:
				"Name to use for the downloaded file. Cannot be used with --extract.",
			exclusive: ["extract"],
		}),
		header: Flags.string({
			description:
				"Custom header to include in the fetch request. Format: 'Name: Value'. Can be used multiple times.",
			char: "H",
			multiple: true,
		}),
		strip: Flags.integer({
			description:
				"Strip leading paths from file names during extraction. Only works with --extract.",
			char: "s",
			min: 0,
			dependsOn: ["extract"],
		}),
		...BaseCommand.flags,
	};

	// public static override readonly examples = ["<%= config.bin %> <%= command.id %>"];

	public async run(): Promise<DownloadResponse> {
		const { url } = this.args;
		const { extract, out, filename, header, strip } = this.flags;

		this.log(`Downloading ${url.toString()}`);

		// Parse headers from array of strings in format "Name: Value"
		const headers: Record<string, string> = {};
		if (header) {
			for (const headerStr of header) {
				const colonIndex = headerStr.indexOf(":");
				if (colonIndex === -1) {
					throw new Error(
						`Invalid header format: "${headerStr}". Expected format: "Name: Value"`,
					);
				}
				const name = headerStr.slice(0, colonIndex).trim();
				const value = headerStr.slice(colonIndex + 1).trim();
				headers[name] = value;
			}
		}

		const options: DillOptions = {
			extract,
			downloadDir: out ?? process.cwd(),
			filename,
			...(Object.keys(headers).length > 0 && { headers }),
			...(strip !== undefined && { strip }),
		};

		return await download(url, options);
	}
}
