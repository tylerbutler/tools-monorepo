import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import ignore from "ignore";

import type { BuildContext } from "../../buildContext.js";
import type { BuildGraphPackage } from "../../buildGraph.js";
import {
	getInstalledPackageVersion,
	getRecursiveFiles,
	globFn,
} from "../taskUtils.js";
import { LeafWithDoneFileTask } from "./leafTask.js";

/**
 * Regular expression to split lines by newline (supports both Unix and Windows line endings)
 */
const regexNewlineSplit = /\r?\n/;

export class PrettierTask extends LeafWithDoneFileTask {
	private parsed = false;
	private entries: string[] = [];
	private ignorePath: string | undefined;
	public constructor(
		node: BuildGraphPackage,
		command: string,
		context: BuildContext,
		taskName: string | undefined,
	) {
		super(node, command, context, taskName);

		// TODO: something better
		const args = this.command.split(" ");
		if (args[0] !== "prettier") {
			return;
		}
		for (let i = 1; i < args.length; i++) {
			if (args[i].startsWith("--")) {
				if (args[i] === "--check" || args[i] === "--cache") {
					continue;
				}
				if (args[i] === "--ignore-path" && i + 1 < args.length) {
					this.ignorePath = args[i + 1];
					i++;
					continue;
				}
				return;
			}
			let entry = args[i];
			if (entry.startsWith('"') && entry.endsWith('"')) {
				entry = entry.substring(1, entry.length - 1);
			}
			this.entries.push(entry);
		}
		this.parsed = this.entries.length > 0;
	}
	protected get configFileFullPath() {
		// Currently there's no package-level config file, so just use tsconfig.json
		return this.getPackageFileFullPath(".prettierrc.json");
	}

	protected async getDoneFileContent() {
		if (!this.parsed) {
			this.traceError(
				"error generating done file content, unable to understand command line",
			);
			return undefined;
		}

		let ignoreEntries: string[] = [];
		const ignorePath = this.ignorePath ?? ".prettierignore";
		const ignoreFile = this.getPackageFileFullPath(ignorePath);
		try {
			if (existsSync(ignoreFile)) {
				const ignoreFileContent = await readFile(ignoreFile, "utf8");
				ignoreEntries = ignoreFileContent.split(regexNewlineSplit);
				ignoreEntries = ignoreEntries.filter(
					(value) => value && !value.startsWith("#"),
				);
			} else if (this.ignorePath) {
				this.traceError(
					`error generating done file content, unable to find ${ignoreFile}`,
				);
				return undefined;
			}
		} catch {
			this.traceError(
				`error generating done file content, unable to read ${ignoreFile} file`,
			);
			return undefined;
		}

		// filter some of the extension the prettier doesn't care about as well
		ignoreEntries.push("**/*.log", "**/*.tsbuildinfo");

		const ignoreObject = ignore().add(ignoreEntries);
		let files: string[] = [];
		try {
			// biome-ignore lint/style/useForOf: index-based iteration needed for array access pattern
			for (let i = 0; i < this.entries.length; i++) {
				const entry = this.entries[i];
				const fullPath = this.getPackageFileFullPath(entry);
				if (existsSync(fullPath)) {
					if ((await stat(fullPath)).isDirectory()) {
						// TODO: This includes files that prettier might not check
						const recursiveFiles = await getRecursiveFiles(fullPath);
						files.push(
							...recursiveFiles.map((file) =>
								path.relative(this.node.pkg.directory, file),
							),
						);
					} else {
						files.push(entry);
					}
				} else {
					const globFiles = await globFn(entry, {
						cwd: this.node.pkg.directory,
					});
					files.push(...globFiles);
				}
			}
			files = ignoreObject.filter(files);
			const hashesP = files.map(async (name) => {
				const hash = await this.node.context.fileHashCache.getFileHash(
					this.getPackageFileFullPath(name),
				);
				return { name, hash };
			});
			const hashes = await Promise.all(hashesP);
			return JSON.stringify({
				version: await getInstalledPackageVersion(
					"prettier",
					this.node.pkg.directory,
				),
				hashes,
			});
		} catch (e) {
			this.traceError(`error generating done file content. ${e}`);
			return undefined;
		}
	}

	/**
	 * Helper method to get the list of files prettier will format.
	 * Used by both getDoneFileContent and cache methods.
	 */
	private async getPrettierFiles(): Promise<string[]> {
		if (!this.parsed) {
			return [];
		}

		let ignoreEntries: string[] = [];
		const ignorePath = this.ignorePath ?? ".prettierignore";
		const ignoreFile = this.getPackageFileFullPath(ignorePath);
		try {
			if (existsSync(ignoreFile)) {
				const ignoreFileContent = await readFile(ignoreFile, "utf8");
				ignoreEntries = ignoreFileContent.split(regexNewlineSplit);
				ignoreEntries = ignoreEntries.filter(
					(value) => value && !value.startsWith("#"),
				);
			}
		} catch {
			return [];
		}

		// filter some of the extension the prettier doesn't care about as well
		ignoreEntries.push("**/*.log", "**/*.tsbuildinfo");

		const ignoreObject = ignore().add(ignoreEntries);
		let files: string[] = [];
		try {
			// biome-ignore lint/style/useForOf: index-based iteration needed for array access pattern
			for (let i = 0; i < this.entries.length; i++) {
				const entry = this.entries[i];
				const fullPath = this.getPackageFileFullPath(entry);
				if (existsSync(fullPath)) {
					if ((await stat(fullPath)).isDirectory()) {
						const recursiveFiles = await getRecursiveFiles(fullPath);
						files.push(
							...recursiveFiles.map((file) =>
								path.relative(this.node.pkg.directory, file),
							),
						);
					} else {
						files.push(entry);
					}
				} else {
					const globFiles = await globFn(entry, {
						cwd: this.node.pkg.directory,
					});
					files.push(...globFiles);
				}
			}
			files = ignoreObject.filter(files);
			return files.map((f) => this.getPackageFileFullPath(f));
		} catch {
			return [];
		}
	}

	protected override async getCacheInputFiles(): Promise<string[]> {
		// Get done file from parent class
		const files = await super.getCacheInputFiles();

		// Add prettier files
		files.push(...(await this.getPrettierFiles()));

		// Include prettier config files
		const configPath = this.configFileFullPath;
		if (configPath && existsSync(configPath)) {
			files.push(configPath);
		}

		const ignorePath = this.ignorePath ?? ".prettierignore";
		const ignoreFile = this.getPackageFileFullPath(ignorePath);
		if (existsSync(ignoreFile)) {
			files.push(ignoreFile);
		}

		return files;
	}

	protected override async getCacheOutputFiles(): Promise<string[]> {
		// Get done file from parent class
		const outputs = await super.getCacheOutputFiles();

		// Prettier modifies files in place, so outputs are the same as inputs
		outputs.push(...(await this.getPrettierFiles()));

		return outputs;
	}
}
