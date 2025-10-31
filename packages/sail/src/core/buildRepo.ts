import { existsSync } from "node:fs";
import path from "node:path";
import {
	BuildProject,
	findGitRootSync,
	getBuildProjectConfig,
	type IPackage,
	type IWorkspace,
	type Logger,
	type ReleaseGroupName,
} from "@tylerbu/sail-infrastructure";
import chalk from "picocolors";
import { simpleGit } from "simple-git";

import type { BuildPackage } from "../common/npmPackage.js";
import {
	type ExecAsyncResult,
	execWithErrorAsync,
	isSameFileOrDir,
	lookUpDirSync,
} from "../common/utils.js";
import type { BuildContext } from "./buildContext.js";
import { BuildGraph } from "./buildGraph.js";
import { getSailConfig } from "./config.js";
import type { BuildOptions } from "./options.js";
import type { TaskHandlerPlugin } from "./sailConfig.js";
import { TaskHandlerRegistry } from "./tasks/TaskHandlerRegistry.js";

// const traceInit = registerDebug("sail:init");

export interface IPackageMatchedOptions {
	match: string[];
	all: boolean;
	dirs: string[];
	releaseGroups: ReleaseGroupName[];
}

export class SailBuildRepo extends BuildProject<BuildPackage> {
	protected context: BuildContext;
	private handlersLoadedPromise?: Promise<void>;

	public constructor(
		searchPath: string,
		private log: Logger,
	) {
		super(searchPath);
		const { config: sailConfig } = getSailConfig(searchPath);
		const { config: buildProjectConfig } = getBuildProjectConfig(searchPath);

		const gitRoot = findGitRootSync(searchPath);

		// Initialize the task handler registry
		const taskHandlerRegistry = new TaskHandlerRegistry();

		this.context = {
			sailConfig,
			buildProjectConfig,
			repoRoot: this.root,
			gitRepo: simpleGit(gitRoot),
			gitRoot,
			log: this.log,
			taskHandlerRegistry,
		};

		// Start loading plugins if specified
		if (sailConfig.plugins && sailConfig.plugins.length > 0) {
			this.handlersLoadedPromise = this.loadPlugins(
				sailConfig.plugins,
				taskHandlerRegistry,
			);
		}
	}

	/**
	 * Load task handler plugins from configuration.
	 */
	private async loadPlugins(
		plugins: TaskHandlerPlugin[],
		registry: TaskHandlerRegistry,
	): Promise<void> {
		const errors = await registry.loadPlugins(plugins, this.root);
		if (errors.length > 0) {
			for (const error of errors) {
				this.log.errorLog(`Failed to load plugin: ${error.message}`);
			}
			// Don't fail the build, just log the errors
		}
	}

	/**
	 * Ensure all custom handlers are loaded before proceeding.
	 * This should be called before creating the build graph.
	 */
	private async ensureHandlersLoaded(): Promise<void> {
		if (this.handlersLoadedPromise) {
			await this.handlersLoadedPromise;
		}
	}

	public async clean(packages: IPackage[], status: boolean) {
		const cleanP: Promise<ExecAsyncResult>[] = [];
		let numDone = 0;
		const execCleanScript = async (pkg: IPackage, cleanScript: string) => {
			const startTime = Date.now();
			const result = await execWithErrorAsync(
				cleanScript,
				{
					cwd: pkg.directory,
					env: {
						PATH: `${
							// biome-ignore lint/complexity/useLiteralKeys: PATH may not be defined as a property
							// biome-ignore lint/style/noProcessEnv: PATH environment variable needed for executable resolution
							process.env["PATH"]
						}${path.delimiter}${path.join(
							pkg.directory,
							"node_modules",
							".bin",
						)}`,
					},
				},
				pkg.nameColored,
			);

			if (status) {
				const elapsedTime = (Date.now() - startTime) / 1000;
				this.log.log(
					`[${++numDone}/${cleanP.length}] ${
						pkg.nameColored
					}: ${cleanScript} - ${elapsedTime.toFixed(3)}s`,
				);
			}
			return result;
		};
		for (const pkg of packages) {
			const cleanScript = pkg.getScript("clean");
			if (cleanScript) {
				cleanP.push(execCleanScript(pkg, cleanScript));
			}
		}
		const results = await Promise.all(cleanP);
		return !results.some((result) => result.error);
	}

	public static async ensureInstalled(packages: IPackage[]) {
		const installedWorkspaces = new Set<IWorkspace>();
		const installPromises: Promise<boolean>[] = [];
		for (const pkg of packages) {
			if (!installedWorkspaces.has(pkg.workspace)) {
				installedWorkspaces.add(pkg.workspace);
				installPromises.push(pkg.workspace.install(false));
			}
		}
		const rets = await Promise.all(installPromises);
		return !rets.some((result) => !result);
	}

	public setMatched(options: IPackageMatchedOptions) {
		const hasMatchArgs =
			options.match.length > 0 ||
			options.dirs.length > 0 ||
			options.releaseGroups.length > 0;

		if (hasMatchArgs) {
			let matched = false;
			for (const arg of options.match) {
				const regExp = new RegExp(arg);
				if (this.matchWithFilter((pkg) => regExp.test(pkg.name))) {
					matched = true;
				}
			}

			for (const arg of options.dirs) {
				this.setMatchedDir(arg, false);
				matched = true;
			}

			for (const releaseGroupName of options.releaseGroups) {
				const releaseGroup = this.releaseGroups.get(
					releaseGroupName as ReleaseGroupName,
				);

				if (releaseGroup === undefined) {
					throw new Error(
						`Release group '${releaseGroupName}' specified is not defined in the repo.`,
					);
				}
				this.setMatchedWorkspace(releaseGroup.workspace);
				matched = true;
			}

			return matched;
		}

		if (options.all) {
			return this.matchWithFilter(() => true);
		}

		// Match based on CWD
		this.setMatchedDir(process.cwd(), true);
		return true;
	}

	public async createBuildGraph(options: BuildOptions) {
		// Ensure all custom handlers are loaded before creating the build graph
		await this.ensureHandlersLoaded();

		const buildTargetNames = options.buildTaskNames;
		const { config } = getSailConfig(this.root);
		return new BuildGraph(
			this.packages,
			[...this.packages.values()],
			this.context,
			buildTargetNames,
			config.tasks,
			(pkg: BuildPackage) => {
				return (dep: BuildPackage) => {
					return pkg.releaseGroup === dep.releaseGroup;
				};
			},
			this.log,
			options,
		);
	}

	private matchWithFilter(callback: (pkg: BuildPackage) => boolean) {
		let matched = false;
		for (const pkg of this.packages.values()) {
			if (!pkg.matched && callback(pkg)) {
				this.setMatchedPackage(pkg);
				matched = true;
			}
		}
		return matched;
	}

	private setMatchedDir(dir: string, matchReleaseGroup: boolean) {
		const pkgDir = lookUpDirSync(dir, (currentDir) => {
			return existsSync(path.join(currentDir, "package.json"));
		});
		if (!pkgDir) {
			throw new Error(`Unable to look up package in directory '${dir}'.`);
		}

		for (const releaseGroup of this.releaseGroups.values()) {
			if (
				isSameFileOrDir(
					releaseGroup.rootPackage?.directory ??
						releaseGroup.workspace.directory,
					pkgDir,
				)
			) {
				this.log.log(
					`Release group ${chalk.cyanBright(releaseGroup.name)} matched (directory: ${dir})`,
				);
				this.setMatchedWorkspace(releaseGroup.workspace);
				return;
			}
		}

		const foundPackage = [...this.packages.values()].find((pkg) =>
			isSameFileOrDir(pkg.directory, pkgDir),
		);
		if (foundPackage === undefined) {
			throw new Error(
				`Package in '${pkgDir}' not part of the Fluid repo '${this.root}'.`,
			);
		}

		if (matchReleaseGroup && foundPackage !== undefined) {
			this.log.log(
				`Release group ${chalk.cyanBright(
					foundPackage.releaseGroup,
				)} matched (directory: ${dir})`,
			);
			this.setMatchedWorkspace(foundPackage.workspace);
		} else {
			this.log.log(`${foundPackage.nameColored} matched (${dir})`);
			this.setMatchedPackage(foundPackage);
		}
	}

	private setMatchedWorkspace(workspace: IWorkspace) {
		for (const pkg of this.packages.values()) {
			if (pkg.workspace === workspace) {
				// const rootPkg = new BuildPackage(workspace.rootPackage);
				this.setMatchedPackage(pkg);
				pkg.matched = true;
			}
		}
	}

	private setMatchedPackage(pkg: BuildPackage) {
		this.log.verbose(`${pkg.nameColored}: matched`);
		pkg.matched = true;
	}
}
