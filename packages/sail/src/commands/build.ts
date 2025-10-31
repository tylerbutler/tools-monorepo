import { existsSync } from "node:fs";
import path from "node:path";
import { Args, Flags } from "@oclif/core";
import { Stopwatch } from "@tylerbu/sail-infrastructure";
import { BaseSailCommand } from "../baseCommand.js";
import { SailBuildRepo } from "../core/buildRepo.js";
import { type BuildOptions, defaultOptions } from "../core/options.js";
import { runBuild } from "../core/runBuild.js";
import { initializeSharedCache } from "../core/sharedCache/index.js";
import { cacheFlags, selectionFlags } from "../flags.js";

export default class BuildCommand extends BaseSailCommand<typeof BuildCommand> {
	static override readonly description = "Build stuff.";

	static override readonly args = {
		partial_name: Args.string({
			description: "Regular expression or string to filter packages by name.",
			default: ".",
			required: false,
		}),
	};

	static override readonly flags = {
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
			default: defaultOptions.concurrency,
			helpGroup: "RUN",
		}),
		...BaseSailCommand.flags,

		// Hidden flags
		showExec: Flags.boolean({
			hidden: true,
		}),
	} as const;

	static override readonly examples = ["<%= config.bin %> <%= command.id %>"];

	static override aliases: string[] = ["b"];

	public async run(): Promise<void> {
		const { flags, args } = this;
		const packageFilter = args.partial_name;
		const {
			all,
			cacheDir,
			skipCacheWrite,
			verifyCacheIntegrity,
			clean,
			concurrency,
			force,
			rebuild,
			releaseGroup,
			showExec,
			task,
			vscode,
		} = flags;

		const tasks: Set<string> = new Set(task);
		const timer = new Stopwatch(true);
		// const fluidConfig = getSailConfig(resolvedRoot, false);
		// const isDefaultConfig = fluidConfig === DEFAULT_SAIL_CONFIG;

		const buildRepo = new SailBuildRepo(process.cwd(), this);

		// Initialize shared cache if enabled
		const sharedCache = await initializeSharedCache(
			cacheDir,
			buildRepo.root,
			skipCacheWrite,
			verifyCacheIntegrity,
		);

		if (sharedCache) {
			// Add cache to build context
			(buildRepo as any).context.sharedCache = sharedCache;
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
			concurrency,
			force: force || tasks.has("clean"),
			releaseGroups:
				releaseGroup === undefined
					? defaultOptions.releaseGroups
					: [releaseGroup],
			showExec,
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

			if (buildResult !== 0) {
				this.error(`Build result was ${buildResult}.`, { exit: buildResult });
			}
		} catch (error) {
			// this.warning(error as Error);
			this.error(error as Error, { exit: 100 });
		}
	}
}
