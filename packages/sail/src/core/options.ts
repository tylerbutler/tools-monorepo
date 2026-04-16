import os from "node:os";

import type { IPackageMatchedOptions } from "./buildRepo.js";

export interface UserControlledOptions {
	clean: boolean;
	concurrency: number;
	worker: boolean;
	workerMemoryLimit: number;
	buildTaskNames: string[];
	vscode: boolean;
	force: boolean;
	showExec: boolean;
	quiet: boolean;

	defaultRoot?: string;
	root?: string;
}

export interface BuildOptions
	extends IPackageMatchedOptions,
		UserControlledOptions {
	matchedOnly: boolean;
	build?: boolean;
	workerThreads: boolean;
}

/**
 * Get the default concurrency value based on CPU count.
 * Exported as a function to avoid issues with README generation picking up machine-specific values.
 */
export function getDefaultConcurrency(): number {
	return os.cpus().length;
}

export const defaultOptions: BuildOptions = {
	showExec: false,
	clean: false,
	match: [],
	dirs: [],
	releaseGroups: [],
	matchedOnly: false,
	buildTaskNames: [],
	vscode: false,
	force: false,
	concurrency: getDefaultConcurrency(),
	all: false,
	worker: false,
	workerThreads: false,
	quiet: false,
	// Setting this lower causes more worker restarts, but uses less memory.
	// Since using too much memory can cause slow downs, and too many worker restarts can also cause slowdowns,
	// it's a tradeoff.
	// Around 2 GB seems to be ideal.
	// Both larger and smaller values have shown to be slower (even with plenty of free ram), and too large of values (4 GiB) on low concurrency runs (4) has resulted in
	// "build:esnext: Internal uncaught exception: Error: Worker disconnect" likely due to node processes exceeding 4 GiB of memory.
	workerMemoryLimit: 2 * 1024 * 1024 * 1024,
} as const;
