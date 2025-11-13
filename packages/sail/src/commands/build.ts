import { existsSync } from "node:fs";
import path from "pathe";
import readline from "node:readline/promises";
import { Args, Flags } from "@oclif/core";
import { Stopwatch } from "@tylerbu/sail-infrastructure";
import chalk from "picocolors";
import { BaseSailCommand } from "../baseCommand.js";
import { SailBuildRepo } from "../core/buildRepo.js";
import { type BuildOptions, defaultOptions } from "../core/options.js";
import { runBuild } from "../core/runBuild.js";
import { initializeSharedCache } from "../core/sharedCache/index.js";
import { cacheFlags, selectionFlags } from "../flags.js";

export default class BuildCommand extends BaseSailCommand<typeof BuildCommand> {
	public static override readonly description = "Build stuff.";

	public static override readonly args = {
		partial_name: Args.string({
			description: "Regular expression or string to filter packages by name.",
			default: ".",
			required: false,
		}),
	};

	public static override readonly flags = {
		...selectionFlags,
		...cacheFlags,
		task: Flags.string({
			char: "t",
			aliases: ["tasks"],
			description: "The task to execute. Multiple tasks can be provided.",
			default: ["build"],
			multiple: true,
		}),
		clean: Flags.boolean({
			char: "c",
			description: "Same as '--task clean'.",
			helpGroup: "OTHER TASK",
			exclusive: ["rebuild"],
		}),
		rebuild: Flags.boolean({
			char: "r",
			description: "Same as '--task clean --task build'.",
			helpGroup: "OTHER TASK",
			exclusive: ["clean"],
		}),
		force: Flags.boolean({
			description: "Force the tasks to run, ignoring dependencies.",
		}),
		vscode: Flags.boolean({
			description:
				"Output error messages to work with the default problem matcher in VS Code.",
		}),
		worker: Flags.boolean({
			description:
				"Reuse worker threads for some tasks, increasing memory use but lowering overhead.",
			helpGroup: "RUN",
		}),
		workerMemoryLimitMB: Flags.integer({
			description:
				"Memory limit for worker threads in MB. Only works with '--worker'.",
			dependsOn: ["worker"],
			helpGroup: "RUN",
		}),
		concurrency: Flags.integer({
			description:
				"How many tasks can execute at a time. Defaults to 'os.cpus().length'.",
			min: 1,
			helpGroup: "RUN",
		}),
		...BaseSailCommand.flags,

		// Hidden flags
		showExec: Flags.boolean({
			hidden: true,
		}),
	} as const;

	public static override readonly examples = [
		"<%= config.bin %> <%= command.id %>",
	];

	public static override aliases: string[] = ["b"];

	public async run(): Promise<void> {
		const { flags, args } = this;
		const packageFilter = args.partial_name;
		const {
			all,
			cacheDir,
			skipCacheWrite,
			verifyCacheIntegrity,
			overwriteCache,
			clean,
			concurrency,
			force,
			rebuild,
			releaseGroup,
			showExec,
			task,
			quiet,
			vscode,
		} = flags;

		const tasks: Set<string> = new Set(task);
		const timer = new Stopwatch(true);
		// const fluidConfig = getSailConfig(resolvedRoot, false);
		// const isDefaultConfig = fluidConfig === DEFAULT_SAIL_CONFIG;

		const buildRepo = new SailBuildRepo(process.cwd(), this);

		// Confirm overwrite-cache option if enabled
		if (overwriteCache) {
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
			});

			const response = await rl.question(
				"--overwrite-cache is enabled. This will delete existing cache entries on conflict. Continue? (y/n): ",
			);
			rl.close();

			if (response.toLowerCase() !== "y" && response.toLowerCase() !== "yes") {
				this.log("Aborted by user.");
				return;
			}
		}

		// Initialize shared cache if enabled
		const sharedCache = await initializeSharedCache(
			cacheDir,
			buildRepo.root,
			skipCacheWrite,
			verifyCacheIntegrity,
			{
				log: (message?: string) => this.log(message ?? ""),
				info: (msg?: string | Error) => this.log(String(msg ?? "")),
				warning: (msg?: string | Error) => this.warning(String(msg ?? "")),
				errorLog: (msg?: string | Error) => this.log(String(msg ?? "")),
				verbose: (msg?: string | Error) => this.log(String(msg ?? "")),
			},
			overwriteCache,
		);

		// Display prominent cache status
		if (sharedCache) {
			// Add cache to build context
			// biome-ignore lint/suspicious/noExplicitAny: Accessing internal context property
			(buildRepo as any).context.sharedCache = sharedCache;

			// Prominent success message with green background
			this.log(chalk.bgGreen(chalk.black(" ✓ SHARED CACHE ENABLED ")));
			this.log(chalk.green(`   Cache Directory: ${cacheDir}`));
		} else {
			// Prominent warning message with yellow background
			this.log(chalk.bgYellow(chalk.black(" ⚠ SHARED CACHE DISABLED ")));
			this.log(
				chalk.yellow(
					"   Set SAIL_CACHE_DIR or use --cache-dir to enable shared caching",
				),
			);
		}

		if (rebuild) {
			tasks.add("clean");
		}

		if (clean) {
			tasks.add("clean");
			tasks.delete("build");
		}

		const options: BuildOptions = {
			...defaultOptions,
			all,
			build: tasks.has("build"),
			buildTaskNames: [...tasks],
			clean: tasks.has("clean"),
			concurrency: concurrency ?? defaultOptions.concurrency,
			force: force || tasks.has("clean"),
			releaseGroups:
				releaseGroup === undefined
					? defaultOptions.releaseGroups
					: [releaseGroup],
			showExec,
			quiet,
			vscode,
		};

		// Package regexp or paths
		const resolvedPath = path.resolve(packageFilter);
		if (existsSync(resolvedPath)) {
			options.dirs.push(packageFilter);
		} else {
			options.match.push(packageFilter);
		}

		try {
			const buildResult = await runBuild(buildRepo, options, timer, this);

			// Wait for all pending cache operations to complete before exit
			// This prevents "unsettled top-level await" warnings when background
			// operations (like access time updates) are still pending
			if (sharedCache) {
				await sharedCache.waitForPendingOperations();
			}

			if (buildResult !== 0) {
				this.error(`Build result was ${buildResult}.`, { exit: buildResult });
			}
		} catch (error) {
			// this.warning(error as Error);
			this.error(error as Error, { exit: 100 });
		} finally {
			// Ensure pending operations complete even on error
			if (sharedCache) {
				await sharedCache.waitForPendingOperations();
			}
		}
	}
}
