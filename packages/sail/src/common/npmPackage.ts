import { existsSync } from "node:fs";
import path from "node:path";
import {
	type PackageJson as BasePackageJson,
	type IBuildProject,
	type IPackage,
	type IPackageManager,
	type IReleaseGroup,
	type IWorkspace,
	PackageBase,
	type ReleaseGroupName,
} from "@tylerbu/sail-infrastructure";
import registerDebug from "debug";

import type { ISailConfig } from "../core/sailConfig.js";
import { rimrafWithErrorAsync } from "./utils.js";

const traceInit = registerDebug("sail:init");

/**
 * A type representing Sail-specific config that may be in package.json.
 */
export type SailPackageJson = BasePackageJson & {
	/**
	 * Sail config. Some properties only apply when set in the root or release group root package.json.
	 */
	sail?: ISailConfig;

	/**
	 * For back-compat with fluid-build only.
	 *
	 * @deprecated Use the "sail" property instead.
	 */
	fluidBuild?: ISailConfig;
};

export class BuildPackage extends PackageBase<SailPackageJson> {
	private _matched = false;

	/**
	 * Create a new package from a package.json file. Prefer the .load method to calling the contructor directly.
	 *
	 * @param packageJsonFileName - The path to a package.json file.
	 * @param group - A group that this package is a part of.
	 * @param monoRepo - Set this if the package is part of a release group (monorepo).
	 * @param additionalProperties - An object with additional properties that should be added to the class. This is
	 * useful to augment the package class with additional properties.
	 */
	public constructor(packageInput: IPackage) {
		const {
			packageJsonFilePath,
			// packageManager,
			workspace,
			isWorkspaceRoot,
			releaseGroup,
			isReleaseGroupRoot,
		} = packageInput;
		super(
			packageJsonFilePath,
			// packageManager,
			workspace,
			isWorkspaceRoot,
			releaseGroup,
			isReleaseGroupRoot,
		);
		traceInit(`${this.nameColored}: Package loaded`);
		this.monoRepo = isWorkspaceRoot
			? new MonoRepo(
					releaseGroup,
					path.basename(packageJsonFilePath),
					releaseGroup,
					workspace,
				)
			: undefined;
	}

	public get matched() {
		return this._matched;
	}

	public set matched(value) {
		this._matched = value;
	}

	/**
	 * Get the full path for the lock file.
	 * @returns full path for the lock file, or undefined if one doesn't exist
	 */
	public getLockFilePath() {
		const directory = this.workspace.directory;
		for (const lockfile of this.workspace.packageManager.lockfileNames) {
			const full = path.join(directory, lockfile);
			if (existsSync(full)) {
				return full;
			}
		}
		return undefined;
	}

	public async cleanNodeModules() {
		return rimrafWithErrorAsync(
			path.join(this.directory, "node_modules"),
			this.nameColored,
		);
	}

	private _monoRepo: MonoRepo | undefined;

	private set monoRepo(value: MonoRepo | undefined) {
		this._monoRepo = value;
	}

	/**
	 * @deprecated Replace usage as soon as possible.
	 */
	public get monoRepo(): MonoRepo | undefined {
		return this._monoRepo;
	}
}

export class MonoRepo implements IWorkspace {
	public constructor(
		public readonly kind: string,
		public readonly repoPath: string,
		private readonly releaseGroupName: ReleaseGroupName,
		private readonly workspace: IWorkspace,
	) {}

	public get directory(): string {
		return this.workspace.directory;
	}

	public get packageManager(): IPackageManager {
		return this.workspace.packageManager;
	}

	public get rootPackage(): IPackage {
		return this.workspace.rootPackage;
	}

	public get releaseGroups(): Map<ReleaseGroupName, IReleaseGroup> {
		return this.workspace.releaseGroups;
	}

	public get buildProject(): IBuildProject<IPackage> {
		return this.workspace.buildProject;
	}

	public toString(): string {
		return this.workspace.toString();
	}

	public checkInstall(): Promise<true | string[]> {
		return this.workspace.checkInstall();
	}

	public install(updateLockfile: boolean): Promise<boolean> {
		return this.workspace.install(updateLockfile);
	}

	public reload(): void {
		this.workspace.reload();
	}

	public get name() {
		return this.workspace.name;
	}

	public get packages() {
		return this.workspace.packages;
	}

	private _releaseGroup: IReleaseGroup | undefined;

	public get releaseGroup() {
		if (this._releaseGroup === undefined) {
			this._releaseGroup = this.workspace.releaseGroups.get(
				this.releaseGroupName,
			);
			if (this._releaseGroup === undefined) {
				throw new Error(
					`Canot find release group "${this.releaseGroupName}" in workspace "${this.workspace.name}"`,
				);
			}
		}
		return this._releaseGroup;
	}

	public get version() {
		return this.releaseGroup.version;
	}
}
