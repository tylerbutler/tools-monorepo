import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import picomatch from "picomatch";
import type { BuildContext } from "../../buildContext.js";
import type { BuildGraphPackage } from "../../buildGraph.js";
import { globFn } from "../taskUtils.js";
import { LeafTask, LeafWithDoneFileTask } from "./leafTask.js";

/**
 * Regular expression to extract package name and version from generated version file
 */
const regexVersionExtract =
	/.*\nexport const pkgName = "(.*)";[\n\r]*export const pkgVersion = "([0-9A-Za-z.+-]+)";.*/m;

function unquote(str: string) {
	if (str.length >= 2 && str[0] === '"' && str.at(-1) === '"') {
		return str.substr(1, str.length - 2);
	}
	return str;
}

export class EchoTask extends LeafTask {
	protected override get isIncremental() {
		return true;
	}
	protected override get taskWeight() {
		return 0; // generally cheap relative to other tasks
	}
	protected override async checkLeafIsUpToDate() {
		return true;
	}

	public override async getCacheInputFiles(): Promise<string[]> {
		// Echo task has no real inputs
		return [];
	}

	public override async getCacheOutputFiles(): Promise<string[]> {
		// Echo task produces no output files
		return [];
	}
}

export class CopyfilesTask extends LeafWithDoneFileTask {
	private parsed = false;
	private readonly up: number = 0;
	private readonly copySrcArg: string[] = [];
	private readonly ignore: string = "";
	private readonly all: boolean = false;
	private readonly follow: boolean = false;
	private readonly flat: boolean = false;
	private readonly copyDstArg: string = "";

	public constructor(
		node: BuildGraphPackage,
		command: string,
		context: BuildContext,
		taskName: string | undefined,
	) {
		super(node, command, context, taskName);

		// TODO: something better
		const args = this.command.split(" ");

		const input: string[] = [];
		for (let i = 1; i < args.length; i++) {
			// Only handle -u arg
			if (args[i] === "-u" || args[i] === "--up") {
				if (i + 1 >= args.length) {
					return;
				}
				this.up = Number.parseInt(args[i + 1], 10);
				i++;
				continue;
			}
			if (args[i] === "-e") {
				if (i + 1 >= args.length) {
					return;
				}
				this.ignore = args[i + 1];
				i++;
				continue;
			}
			if (args[i] === "-f") {
				this.flat = true;
				continue;
			}
			if (args[i] === "-F") {
				this.follow = true;
				continue;
			}
			if (args[i] === "-a") {
				this.all = true;
				continue;
			}
			if (args[i].startsWith("-") || args[i].startsWith("--")) {
				// copyfiles ignores flags it doesn't know as well.
				continue;
			}

			const unquoted = unquote(args[i]);
			if (unquoted.includes("**") && unquoted === args[i]) {
				// TODO: Review if glob pattern handling needs implementation
			}
			input.push(unquote(args[i]));
		}

		if (input.length < 2) {
			// Not enough arguments
			return;
		}

		// biome-ignore lint/style/noNonNullAssertion: array length is checked above before pop
		this.copyDstArg = input.pop()!;
		this.copySrcArg = input;

		this.parsed = true;
	}

	private _srcFiles: string[] | undefined;
	private _dstFiles: string[] | undefined;

	protected override get recheckLeafIsUpToDate(): boolean {
		// The task knows all the input, so we can check if this task needs to execute
		// even dependent tasks are out of date.
		return true;
	}

	protected override get taskWeight() {
		return 0; // generally cheap relative to other tasks
	}
	protected async getInputFiles() {
		if (!this.parsed) {
			// If we can't parse the argument, we don't know what we are doing.
			throw new Error("error parsing command line");
		}
		if (!this._srcFiles) {
			const srcFilesP = this.copySrcArg.map(async (srcArg) => {
				const srcGlob = path.resolve(this.node.pkg.directory, srcArg);
				return globFn(srcGlob, {
					nodir: true,
					dot: this.all,
					follow: this.follow,
					ignore: this.ignore,
				});
			});
			this._srcFiles = (await Promise.all(srcFilesP)).flat();
		}
		return this._srcFiles;
	}

	protected async getOutputFiles() {
		if (!this.parsed) {
			// If we can't parse the argument, we don't know what we are doing.
			throw new Error("error parsing command line");
		}
		if (!this._dstFiles) {
			const directory = this.node.pkg.directory;
			const dstPath = path.resolve(directory, this.copyDstArg);
			const srcFiles = await this.getInputFiles();
			this._dstFiles = srcFiles.map((match) => {
				if (this.flat) {
					return path.join(dstPath, path.basename(match));
				}
				const relPath = path.relative(directory, match);
				if (this.up === 0) {
					return path.join(dstPath, relPath);
				}

				const paths = relPath.split(path.sep);
				if (paths.length - 1 < this.up) {
					throw new Error("Cannot go up that far");
				}

				return path.join(dstPath, ...paths.slice(this.up));
			});
		}

		return this._dstFiles;
	}
}

export class GenVerTask extends LeafTask {
	protected override get isIncremental() {
		return true;
	}
	protected override get taskWeight() {
		return 0; // generally cheap relative to other tasks
	}
	protected override async checkLeafIsUpToDate() {
		const file = path.join(this.node.pkg.directory, "src/packageVersion.ts");
		try {
			const content = await readFile(file, "utf8");
			const match = content.match(regexVersionExtract);
			if (match === null) {
				this.traceTrigger("src/packageVersion.ts content not matched");
				return false;
			}
			if (this.node.pkg.name !== match[1]) {
				this.traceTrigger("package name in src/packageVersion.ts not matched");
				return false;
			}
			if (this.node.pkg.version !== match[2]) {
				this.traceTrigger(
					"package version in src/packageVersion.ts not matched",
				);
				return false;
			}
			return true;
		} catch {
			this.traceTrigger("failed to read src/packageVersion.ts");
			return false;
		}
	}

	public override async getCacheInputFiles(): Promise<string[]> {
		// GenVerTask reads package.json
		return [this.getPackageFileFullPath("package.json")];
	}

	public override async getCacheOutputFiles(): Promise<string[]> {
		// GenVerTask produces no output files (console output only)
		return [];
	}
}

export class GoodFenceTask extends LeafWithDoneFileTask {
	protected override get taskWeight() {
		return 0; // generally cheap relative to other tasks
	}
	private inputFiles: string[] | undefined;
	protected async getInputFiles(): Promise<string[]> {
		if (!this.inputFiles) {
			const fenceGlob = path.join(this.node.pkg.directory, "**/fence.json");
			const fenceFiles = await globFn(fenceGlob, { nodir: true });
			const tsFileSet = new Set<string>();
			const fencedTsFilesP = fenceFiles.map((fenceFile) => {
				const dir = path.dirname(fenceFile);
				return globFn(path.join(dir, "**/*.ts"));
			});
			const fencedTsFiles = await Promise.all(fencedTsFilesP);
			// biome-ignore lint/complexity/noForEach: forEach is more concise for nested iterations
			fencedTsFiles.forEach((tsFiles) => {
				// biome-ignore lint/complexity/noForEach: forEach is more concise for Set operations
				tsFiles.forEach((file) => {
					tsFileSet.add(file);
				});
			});

			this.inputFiles = [...tsFileSet.keys()];
		}
		return this.inputFiles;
	}
	protected async getOutputFiles(): Promise<string[]> {
		return [];
	}

	public override async getCacheInputFiles(): Promise<string[]> {
		// Get done file from parent class
		const inputs = await super.getCacheInputFiles();
		// Add task-specific input files
		inputs.push(...(await this.getInputFiles()));
		return inputs;
	}

	public override async getCacheOutputFiles(): Promise<string[]> {
		// Get done file from parent class
		const outputs = await super.getCacheOutputFiles();
		// Add task-specific output files (GoodFence produces no output files)
		return outputs;
	}
}

export class DepCruiseTask extends LeafWithDoneFileTask {
	private inputFiles: string[] | undefined;
	protected async getInputFiles(): Promise<string[]> {
		if (this.inputFiles === undefined) {
			const argv = this.command.split(" ");
			const fileOrDir: string[] = [];
			for (let i = 1; i < argv.length; i++) {
				if (argv[i].startsWith("--")) {
					i++;
					continue;
				}
				fileOrDir.push(argv[i]);
			}

			const inputFiles: string[] = [];

			for (const file of fileOrDir) {
				const scan = picomatch.scan(file);
				if (scan.isGlob) {
					const match = picomatch(scan.glob);
					const fullPath = path.join(this.node.pkg.directory, scan.base);
					const files = await readdir(fullPath, { recursive: true });
					inputFiles.push(
						...files
							// biome-ignore lint/nursery/noShadow: standard array method callback parameter shadows outer file variable intentionally
							.filter((file) => match(file))
							// biome-ignore lint/nursery/noShadow: standard array method callback parameter shadows outer file variable intentionally
							.map((file) => path.join(fullPath, file)),
					);
				} else {
					const fullPath = path.resolve(this.node.pkg.directory, file);
					const info = await stat(fullPath);
					if (info.isDirectory()) {
						const files = await readdir(fullPath, { recursive: true });
						// biome-ignore lint/nursery/noShadow: standard array method callback parameter shadows outer file variable intentionally
						inputFiles.push(...files.map((file) => path.join(fullPath, file)));
					} else {
						inputFiles.push(fullPath);
					}
				}
			}
			// Currently,
			// - We don't read the config files to filter with includeOnly, exclude and doNotFollow
			// - We don't filter out extensions that depcruise doesn't scan.
			// So incremental detection will be conservative.
			this.inputFiles = inputFiles;
		}
		return this.inputFiles;
	}

	protected async getOutputFiles(): Promise<string[]> {
		// No output file
		return [];
	}

	public override async getCacheInputFiles(): Promise<string[]> {
		// Get done file from parent class
		const inputs = await super.getCacheInputFiles();
		// Add task-specific input files
		inputs.push(...(await this.getInputFiles()));
		return inputs;
	}

	public override async getCacheOutputFiles(): Promise<string[]> {
		// Get done file from parent class
		const outputs = await super.getCacheOutputFiles();
		// Add task-specific output files (DepCruise produces no output files)
		return outputs;
	}
}
