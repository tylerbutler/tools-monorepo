/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import * as path from "node:path";
import { simpleGit } from "simple-git";
import { globSync } from "tinyglobby";
import { getBuildProjectConfig, isV1Config, isV2Config, } from "./config.js";
import { NotInGitRepository } from "./errors.js";
import { findGitRootSync } from "./git.js";
import { Workspace } from "./workspace.js";
import { loadWorkspacesFromLegacyConfig } from "./workspaceCompat.js";
import { WriteOnceMap } from "./writeOnceMap.js";
/**
 * {@inheritDoc IBuildProject}
 */
export class BuildProject {
    upstreamRemotePartialUrl;
    /**
     * The absolute path to the root of the build project. This is the path where the config file is located, if one
     * exists.
     */
    root;
    /**
     * {@inheritDoc IBuildProject.configuration}
     */
    configuration;
    configurationSource;
    /**
     * The absolute path to the config file.
     */
    configFilePath;
    /**
     * @param searchPath - The path that should be searched for a BuildProject config file.
     * @param infer - Set to true to always infer the build project config.
     * @param gitRepository - A SimpleGit instance rooted in the root of the Git repository housing the BuildProject. This
     * should be set to false if the BuildProject is not within a Git repository.
     */
    constructor(searchPath, infer = false, 
    /**
     * {@inheritDoc IBuildProject.upstreamRemotePartialUrl}
     */
    upstreamRemotePartialUrl) {
        this.upstreamRemotePartialUrl = upstreamRemotePartialUrl;
        // Handle configuration
        if (infer) {
            this.configuration = generateBuildProjectConfig(searchPath);
            this.configFilePath = searchPath;
            this.configurationSource = "INFERRED";
            this.root = searchPath;
        }
        else {
            try {
                const { config, configFilePath } = getBuildProjectConfig(searchPath);
                this.configuration = config;
                this.configFilePath = configFilePath;
                this.configurationSource = configFilePath;
                this.root = path.resolve(path.dirname(configFilePath));
            }
            catch {
                this.configuration = generateBuildProjectConfig(searchPath);
                this.configFilePath = searchPath;
                this.configurationSource = "INFERRED";
                this.root = searchPath;
            }
        }
        if (isV2Config(this.configuration) && this.configuration.excludeGlobs !== undefined) {
            // TODO: refactor and consolidate all this logic. Maybe a single function that take a BuildProjectConfig and
            // returns all the class properties that are set in these blocks. Then we can just set it once and move the logic
            // to a function.
            this.configuration = generateBuildProjectConfig(searchPath);
            this.configFilePath = searchPath;
            this.configurationSource = "INFERRED";
            this.root = searchPath;
        }
        else if ((this.configuration.buildProject ?? this.configuration.repoPackages) === undefined) {
            this.configuration = generateBuildProjectConfig(searchPath);
            this.configFilePath = searchPath;
            this.configurationSource = "INFERRED";
            this.root = searchPath;
        }
        // This will load both v1 and v2 configs with the buildProject setting.
        if (this.configuration.buildProject !== undefined) {
            this._workspaces = new WriteOnceMap(Object.entries(this.configuration.buildProject.workspaces).map((entry) => {
                const name = entry[0];
                const definition = entry[1];
                const ws = Workspace.load(name, definition, this.root, this);
                return [name, ws];
            }));
        }
        else if (isV1Config(this.configuration) &&
            this.configuration.repoPackages !== undefined) {
            console.warn(`The repoPackages setting is deprecated and will no longer be read in a future version. Use buildProject instead.`);
            this._workspaces = loadWorkspacesFromLegacyConfig(this.configuration.repoPackages, this);
        }
        else {
            // this._workspaces = this.configuration.buildProject.workspaces;
            throw new Error("Error loading/generating configuration.");
        }
        const releaseGroups = new Map();
        for (const ws of this.workspaces.values()) {
            for (const [rgName, rg] of ws.releaseGroups) {
                if (releaseGroups.has(rgName)) {
                    throw new Error(`Duplicate release group: ${rgName}`);
                }
                releaseGroups.set(rgName, rg);
            }
        }
        this._releaseGroups = releaseGroups;
    }
    _workspaces;
    /**
     * {@inheritDoc IBuildProject.workspaces}
     */
    get workspaces() {
        return this._workspaces;
    }
    _releaseGroups;
    /**
     * {@inheritDoc IBuildProject.releaseGroups}
     */
    get releaseGroups() {
        return this._releaseGroups;
    }
    _packages = new WriteOnceMap();
    /**
     * {@inheritDoc IBuildProject.packages}
     */
    get packages() {
        if (this._packages.size === 0) {
            for (const ws of this.workspaces.values()) {
                for (const pkg of ws.packages) {
                    this._packages.set(pkg.name, pkg);
                }
            }
        }
        return this._packages;
    }
    /**
     * {@inheritDoc IBuildProject.relativeToRepo}
     */
    relativeToRepo(p) {
        // Replace \ in result with / in case OS is Windows.
        return path.relative(this.root, p).replace(/\\/g, "/");
    }
    /**
     * Reload the BuildProject by calling `reload` on each workspace in the repository.
     */
    reload() {
        for (const ws of this.workspaces.values()) {
            ws.reload();
        }
    }
    gitRepository;
    _checkedForGitRepo = false;
    /**
     * {@inheritDoc IBuildProject.getGitRepository}
     */
    async getGitRepository() {
        if (this.gitRepository !== undefined) {
            return this.gitRepository;
        }
        if (this._checkedForGitRepo === false) {
            this._checkedForGitRepo = true;
            // Check if the path is within a Git repo by trying to find the path to the Git repo root. If not within a git
            // repo, this call will throw a `NotInGitRepository` error.
            const gitRoot = findGitRootSync(this.root);
            this.gitRepository = simpleGit(gitRoot);
            return this.gitRepository;
        }
        throw new NotInGitRepository(this.root);
    }
    /**
     * {@inheritDoc IBuildProject.getPackageReleaseGroup}
     */
    getPackageReleaseGroup(pkg) {
        const found = this.releaseGroups.get(pkg.releaseGroup);
        if (found === undefined) {
            throw new Error(`Cannot find release group for package: ${pkg}`);
        }
        return found;
    }
}
/**
 * Generates a BuildProjectConfig by searching searchPath and below for workspaces. If any workspaces are found, they're
 * automatically added to the config, and a single release group is created within the workspace. Both the workspace and
 * the release group will be named the "basename" of the workspace path.
 *
 * Generated configs use the latest config version.
 */
export function generateBuildProjectConfig(searchPath) {
    const toReturn = {
        version: 2,
        buildProject: {
            workspaces: {},
        },
    };
    // Find workspace roots based on lockfiles
    const lockfilePaths = globSync([
        "package-lock.json",
        "pnpm-lock.yaml",
        "bun.lock",
        "bun.lockb",
        "deno.lock",
        "yarn.lock",
    ].map((lockfile) => `**/${lockfile}`), {
        cwd: searchPath,
        ignore: ["**/node_modules/**"],
        onlyFiles: true,
        absolute: true,
    });
    const workspaceRoots = new Set(lockfilePaths.map((p) => path.dirname(p)));
    if (toReturn.buildProject === undefined) {
        throw new Error("Unexpected error loading config-less build project.");
    }
    // const workspaces: Map<string, string> = new Map();
    for (const workspaceRootPath of workspaceRoots) {
        const wsName = path.basename(workspaceRootPath);
        // workspaces.set(wsName, workspaceRootPath);
        toReturn.buildProject.workspaces[wsName] = {
            directory: workspaceRootPath,
            releaseGroups: makeReleaseGroupDefinitionEntry(wsName),
        };
    }
    return toReturn;
}
function makeReleaseGroupDefinitionEntry(name) {
    const entry = {};
    entry[name] = {
        // include all packages
        include: ["*"],
    };
    return entry;
}
/**
 * Searches for a BuildProject config file and loads the project from the config if found.
 *
 * @typeParam P - The type to use for Packages.
 * @param searchPath - The path to start searching for a BuildProject config.
 * @param infer - Set to true to always infer the build project config.
 * @param upstreamRemotePartialUrl - A partial URL to the upstream repo. This is used to find the local git remote that
 * corresponds to the upstream repo.
 * @returns The loaded BuildProject.
 */
export function loadBuildProject(searchPath, infer = false, upstreamRemotePartialUrl) {
    const repo = new BuildProject(searchPath, infer, upstreamRemotePartialUrl);
    return repo;
}
// export function loadBuildProjectFromConfig<P extends IPackage>(
// 	config: BuildProjectConfig,
// 	upstreamRemotePartialUrl?: string,
// ): IBuildProject<P> {
// 	const repo = new BuildProject<P>(searchPath, infer, upstreamRemotePartialUrl);
// 	return repo;
// }
/**
 * Returns an object containing all the packages, release groups, and workspaces that a given set of packages depends
 * on. This function only considers packages in the BuildProject repo.
 */
export function getAllDependencies(repo, packages) {
    const dependencyPackages = new Set();
    const releaseGroups = new Set();
    const workspaces = new Set();
    for (const pkg of packages) {
        for (const { name } of pkg.combinedDependencies) {
            const depPackage = repo.packages.get(name);
            if (depPackage === undefined) {
                continue;
            }
            if (pkg.releaseGroup !== depPackage.releaseGroup) {
                dependencyPackages.add(depPackage);
                releaseGroups.add(repo.getPackageReleaseGroup(depPackage));
                if (pkg.workspace !== depPackage.workspace) {
                    workspaces.add(depPackage.workspace);
                }
            }
        }
    }
    return {
        packages: [...dependencyPackages],
        releaseGroups: [...releaseGroups],
        workspaces: [...workspaces],
    };
}
//# sourceMappingURL=buildProject.js.map