import type { Logger } from "@tylerbu/cli-api";
import type { Stopwatch } from "@tylerbu/sail-infrastructure";
import chalk from "picocolors";
import { Spinner } from "picospinner";
import type { BuildGraph } from "./buildGraph.js";
import type { SailBuildRepo } from "./buildRepo.js";
import { BuildResult } from "./execution/BuildResult.js";
import type { BuildOptions } from "./options.js";

/**
 * Runs a build on a BuildRepo with the provided options.
 */
export async function runBuild(
	repo: SailBuildRepo,
	options: BuildOptions,
	timer: Stopwatch,
	log: Logger,
): Promise<number> {
	// Set matched package based on options filter
	const matched = repo.setMatched(options);
	if (!matched) {
		throw new Error("No package matched");
	}

	let failureSummary = "";
	let exitCode = 0;
	if (options.buildTaskNames.length > 0) {
		// build the graph
		const spinner = new Spinner("Creating build graph...");
		spinner.start();

		let buildGraph: BuildGraph;
		try {
			buildGraph = await repo.createBuildGraph(options);
		} catch (error: unknown) {
			spinner.stop();
			throw error;
		}
		spinner.succeed("Build graph created.");
		// timer.log("Build graph creation completed");

		// Check install
		if (!(await buildGraph.checkInstall())) {
			throw new Error("Dependencies not installed.");
		}
		// timer.log("Check install completed");

		// Run the build
		const buildResult = await buildGraph.build();
		const buildStatus = buildResultString(buildResult);
		const elapsedTime = timer.log();

		const totalElapsedTime = buildGraph.totalElapsedTime;
		const concurrency = buildGraph.totalElapsedTime / elapsedTime;
		log.log(
			`Execution time: ${totalElapsedTime.toFixed(3)}s, Concurrency: ${concurrency.toFixed(
				3,
			)}, Queue Wait time: ${buildGraph.totalQueueWaitTime.toFixed(3)}s`,
		);

		// Display cache statistics if cache is enabled
		const cacheStats = buildGraph.getCacheStatistics();
		if (cacheStats) {
			log.log(cacheStats);
		}

		log.log(`Build ${buildStatus} - ${elapsedTime.toFixed(3)}s`);

		// Display status symbol legend if tasks were built
		const taskStats = buildGraph.taskStats;
		if (taskStats.leafBuiltCount > 0) {
			displayStatusSymbolLegend(log);
		}

		failureSummary = buildGraph.taskFailureSummary;
		exitCode = buildResult === BuildResult.Failed ? -1 : 0;
	}

	if (options.build === false) {
		log.log("Other switches with no explicit build script, not building.");
	}

	const totalTime = timer.getTotalTime();
	const timeInMinutes =
		totalTime > 60000
			? ` (${Math.floor(totalTime / 60000)}m ${((totalTime % 60000) / 1000).toFixed(3)}s)`
			: "";
	log.log(`Total time: ${(totalTime / 1000).toFixed(3)}s${timeInMinutes}`);

	if (failureSummary !== "") {
		log.log(`\n${failureSummary}`);
	}
	return exitCode;
}

function buildResultString(buildResult: BuildResult) {
	switch (buildResult) {
		case BuildResult.Success:
			return chalk.greenBright("succeeded");
		case BuildResult.Failed:
			return chalk.redBright("failed");
		case BuildResult.UpToDate:
			return chalk.cyanBright("up to date");
		default:
			return chalk.redBright("unexpected");
	}
}

function displayStatusSymbolLegend(log: Logger) {
	log.log("\nStatus symbols:");
	log.log(
		`  ${chalk.yellowBright("\u2713")} Success (executed)              ${chalk.blueBright("\u21E9")} Remote cache hit (downloaded)`,
	);
	log.log(
		`  ${chalk.cyanBright("\u25CB")} Up-to-date (skipped)            ${chalk.greenBright("\u21E7")} Cache write (uploaded)`,
	);
	log.log(
		`  ${chalk.redBright("x")} Failed                          ${chalk.greenBright("\u25A0")} Local cache hit (donefile)`,
	);
}
