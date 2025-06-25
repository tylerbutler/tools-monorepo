import { existsSync } from "node:fs";
import path from "node:path";
import { getResolvedFluidRoot, Timer } from "@fluidframework/build-tools";
import {
	type BuildGraph,
	BuildResult,
} from "@fluidframework/build-tools/dist/fluidBuild/buildGraph.js";
import { FluidRepoBuild } from "@fluidframework/build-tools/dist/fluidBuild/fluidRepoBuild.js";
import { options as DefaultOptions } from "@fluidframework/build-tools/dist/fluidBuild/options.js";
import { Args, type Command, Flags } from "@oclif/core";
import { CommandWithConfig } from "@tylerbu/cli-api";
import chalk from "chalk";
import { DefaultSailConfig, type SailConfig } from "../config.js";

// Known task names
const defaultBuildTaskName = "build";
const defaultCleanTaskName = "clean";

type FluidBuildOptions = typeof DefaultOptions;

export default class BuildCommand extends CommandWithConfig<
	typeof BuildCommand,
	SailConfig
> {
	static override readonly description = "Builds packages.";

	protected override redirectLogToTrace = false;

	static override readonly args = {
		buildPath: Args.string({
			description:
				"Path to project that you want to build. Passing '.' will build the current package or release group.",
			// biome-ignore lint/suspicious/useAwait: parse function is always async
			parse: async (input) => {
				const foundPath = input === "." ? process.cwd() : path.resolve(input);
				if (!existsSync(foundPath)) {
					throw new Error(`Can't find path: ${foundPath}`);
				}
				return foundPath;
			},
		}),
		...CommandWithConfig.args,
	};

	static override readonly flags = {
		all: Flags.boolean({
			description: "Build all packages.",
		}),
		clean: Flags.boolean({
			char: "c",
			description:
				"Include the 'clean' task on matched packages (all if package regexp is not specified).",
		}),
		force: Flags.boolean({
			char: "f",
			description:
				"Force build and ignore dependency check on matched packages (all if package regexp is not specified).",
		}),
		releaseGroup: Flags.string({
			char: "g",
			description: "A release group to build.",
			exclusive: ["all"],
		}),
		task: Flags.string({
			char: "t",
			description:
				"Task to execute. Can be specified multiple times to run multiple tasks.",
			default: ["build"],
			multiple: true,
		}),
		vscode: Flags.boolean({
			description:
				"Output error message to work with default problem matcher in vscode.",
		}),
		...CommandWithConfig.flags,
	};

	static override readonly examples: Command.Example[] = [
		{
			description: "Run the 'build' task on the current project.",
			command: "<%= config.bin %> <%= command.id %> .",
		},
		{
			description:
				"Run the 'clean' task followed by the 'build' task on the current project.",
			command: "<%= config.bin %> <%= command.id %> . -c",
		},
		{
			description: "Run the 'check' and 'test' tasks on the current project.",
			command: "<%= config.bin %> <%= command.id %> . -t check -t test",
		},
	];

	public override async init(): Promise<void> {
		await super.init();
		if (this.commandConfig === undefined) {
			this.verbose("No config file found; using default config");
			this.commandConfig = this.defaultConfig;
		}
	}

	public override async run(): Promise<void> {
		const timer = new Timer(true);
		await this.build(timer);
	}

	protected async build(timer: Timer): Promise<void> {
		const resolvedRoot = await getResolvedFluidRoot(true);
		this.log(`Build Root: ${resolvedRoot}`);

		// Load the packages
		const repo = FluidRepoBuild.create(resolvedRoot);
		timer.time("Package scan completed");

		const options = this.getBuildOptions();

		this.debug(options);

		// Set matched package based on options filter
		const matched = repo.setMatched(options);
		if (!matched) {
			this.error("No package matched", { exit: -4 });
		}

		// Dependency checks
		if (options.depcheck) {
			await repo.depcheck(false);
			timer.time("Dependencies check completed", true);
		}

		let failureSummary = "";
		let exitCode = 0;
		if (options.buildTaskNames.length !== 0) {
			// build the graph
			let buildGraph: BuildGraph;
			try {
				buildGraph = repo.createBuildGraph(options, options.buildTaskNames);
			} catch (e: unknown) {
				this.error((e as Error).message, { exit: -11 });
			}
			timer.time("Build graph creation completed");

			// Check install
			if (!(await buildGraph.checkInstall())) {
				this.error("Dependency not installed. Use --install to fix.", {
					exit: -10,
				});
			}
			timer.time("Check install completed");

			// Run the build
			const buildResult = await buildGraph.build();
			const buildStatus = buildResultString(buildResult);

			const elapsedTime = timer.time();
			const totalElapsedTime = buildGraph.totalElapsedTime;
			const concurrency = buildGraph.totalElapsedTime / elapsedTime;
			this.log(`Status: ${buildStatus} - ${elapsedTime.toFixed(3)}s`);
			this.verbose(
				`Execution time: ${totalElapsedTime.toFixed(
					3,
				)}s, Concurrency: ${concurrency.toFixed(
					3,
				)}, Queue Wait time: ${buildGraph.totalQueueWaitTime.toFixed(3)}s`,
			);

			failureSummary = buildGraph.taskFailureSummary;
			exitCode = buildResult === BuildResult.Failed ? -1 : 0;
		}

		if (options.build === false) {
			this.log("Other switches with no explicit build script, not building.");
		}

		const timeInMinutes =
			timer.getTotalTime() > 60000
				? ` (${Math.floor(timer.getTotalTime() / 60000)}m ${(
						(timer.getTotalTime() % 60000) / 1000
					).toFixed(3)}s)`
				: "";
		this.verbose(
			`Total time: ${(timer.getTotalTime() / 1000).toFixed(
				3,
			)}s${timeInMinutes}`,
		);

		if (failureSummary !== "") {
			this.log(`\n${failureSummary}`);
		}

		this.exit(exitCode);
	}

	/**
	 * Converts the flags and arguments of the command into a FluidBuildOptions object that can be passed to fluid-build.
	 */
	private getBuildOptions(): FluidBuildOptions {
		const { args, flags } = this;
		const requestedTasks = new Set(flags.task);

		const tasksToRun: string[] = [];
		const newOptions: FluidBuildOptions = {
			...DefaultOptions,
			clean: flags.clean ?? DefaultOptions.clean,
			force: flags.force ?? flags.clean ?? DefaultOptions.force,
			vscode: flags.vscode ?? DefaultOptions.vscode,
			workerThreads:
				this.commandConfig?.workerThreads ?? this.defaultConfig.workerThreads,
			worker: this.commandConfig?.worker ?? this.defaultConfig.worker,
		};

		if (flags.clean) {
			tasksToRun.push(defaultCleanTaskName);
		}
		if (requestedTasks.has(defaultBuildTaskName)) {
			newOptions.build = true;
		}
		tasksToRun.push(...requestedTasks);

		// Add tasks to options object
		newOptions.buildTaskNames.push(...tasksToRun);

		// Package regexp or paths
		if (args.buildPath !== undefined) {
			const resolvedPath = path.resolve(args.buildPath);
			if (existsSync(resolvedPath)) {
				newOptions.dirs.push(args.buildPath);
			} else {
				newOptions.match.push(args.buildPath);
			}
		}

		if (flags.releaseGroup !== undefined) {
			newOptions.releaseGroups.push(flags.releaseGroup);
			newOptions.build = true;
		}

		return newOptions;
	}

	protected override get defaultConfig() {
		return DefaultSailConfig;
	}
}

function buildResultString(buildResult: BuildResult) {
	switch (buildResult) {
		case BuildResult.Success:
			return chalk.greenBright("succeeded");
		case BuildResult.Failed:
			return chalk.redBright("failed");
		case BuildResult.UpToDate:
			return chalk.cyanBright("up to date");
	}
}
