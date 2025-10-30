/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import * as path from "node:path";
import execa from "execa";
import resolveWorkspacePkg from "resolve-workspace-root";
import { globSync } from "tinyglobby";
const { getWorkspaceGlobs, resolveWorkspaceRoot } = resolveWorkspacePkg;
import { loadPackageFromWorkspaceDefinition } from "./package.js";
import { detectPackageManager } from "./packageManagers.js";
import { ReleaseGroup } from "./releaseGroup.js";
import { WriteOnceMap } from "./writeOnceMap.js";
/**
 * {@inheritDoc IWorkspace}
 */
export class Workspace {
    buildProject;
    /**
     * {@inheritDoc IWorkspace.name}
     */
    name;
    /**
     * {@inheritDoc IWorkspace.releaseGroups}
     */
    releaseGroups;
    /**
     * {@inheritDoc IWorkspace.rootPackage}
     */
    rootPackage;
    /**
     * {@inheritDoc IWorkspace.packages}
     */
    packages;
    /**
     * {@inheritDoc IWorkspace.directory}
     */
    directory;
    /**
     * {@inheritDoc IWorkspace.packageManager}
     */
    packageManager;
    /**
     * Construct a new workspace object.
     *
     * @param name - The name of the workspace.
     * @param definition - The definition of the workspace.
     * @param root - The path to the root of the workspace.
     */
    constructor(name, definition, root, 
    /**
     * {@inheritDoc IWorkspace.buildProject}
     */
    buildProject) {
        this.buildProject = buildProject;
        this.name = name;
        this.directory = path.resolve(root, definition.directory);
        // Find the workspace root
        const foundWorkspaceRootPath = resolveWorkspaceRoot(this.directory);
        if (foundWorkspaceRootPath === null) {
            throw new Error(`Could not find a workspace root. Started looking at '${this.directory}'.`);
        }
        else if (foundWorkspaceRootPath !== this.directory) {
            // This is a sanity check. directory is the path passed in when creating the Workspace object, while rootDir is
            // the dir that `getPackagesSync` found. They should be the same.
            throw new Error(`The root dir found by resolve-workspace-root, '${foundWorkspaceRootPath}', does not match the configured directory '${this.directory}'`);
        }
        this.packageManager = detectPackageManager(foundWorkspaceRootPath);
        const rootPackageJsonPath = path.join(this.directory, "package.json");
        const workspaceGlobs = getWorkspaceGlobs(foundWorkspaceRootPath);
        if (workspaceGlobs === null) {
            throw new Error(`Couldn't find workspace globs.`);
        }
        const packageGlobs = workspaceGlobs.map((g) => `${g}/package.json`);
        const packageJsonPaths = globSync(packageGlobs, {
            cwd: foundWorkspaceRootPath,
            ignore: ["**/node_modules/**"],
            onlyFiles: true,
            absolute: true,
        });
        // Load the workspace root IPackage
        // this.rootPackage = loadPackageFromWorkspaceDefinition(
        // 	path.join(foundRoot, "package.json"),
        // 	/* isWorkspaceRoot */ true,
        // 	definition,
        // 	this,
        // );
        // this.packages.unshift(this.rootPackage);
        this.packages = [];
        // Load all the workspace packages
        // if (this.packages.length > 1) {
        for (const pkgJsonPath of packageJsonPaths) {
            const isWorkspaceRoot = pkgJsonPath === rootPackageJsonPath;
            // Add all packages except the root; we'll add it after the other packages.
            if (!isWorkspaceRoot) {
                const loadedPackage = loadPackageFromWorkspaceDefinition(pkgJsonPath, 
                /* isWorkspaceRoot */ false, definition, this);
                this.packages.push(loadedPackage);
            }
        }
        this.rootPackage = loadPackageFromWorkspaceDefinition(rootPackageJsonPath, 
        /* isWorkspaceRoot */ true, definition, this);
        if (this.rootPackage === undefined) {
            throw new Error(`No root package found for workspace in '${foundWorkspaceRootPath}'`);
        }
        // Prepend the root package to the package list.
        this.packages.unshift(this.rootPackage);
        const rGroupDefinitions = definition.releaseGroups === undefined
            ? new WriteOnceMap()
            : new WriteOnceMap(Object.entries(definition.releaseGroups).map(([rgName, group]) => {
                return [rgName, group];
            }));
        this.releaseGroups = new Map();
        for (const [groupName, def] of rGroupDefinitions) {
            const newGroup = new ReleaseGroup(groupName, def, this);
            this.releaseGroups.set(groupName, newGroup);
        }
        // sanity check - make sure that all packages are in a release group.
        const noGroup = new Set(this.packages.map((p) => p.name));
        for (const group of this.releaseGroups.values()) {
            for (const pkg of group.packages) {
                noGroup.delete(pkg.name);
            }
        }
        if (noGroup.size > 0) {
            const packageList = [...noGroup].join("\n");
            const message = `Found packages in the ${name} workspace that are not in any release groups. Check your config.\n${packageList}`;
            throw new Error(message);
        }
    }
    /**
     * {@inheritDoc Installable.checkInstall}
     */
    async checkInstall() {
        const errors = [];
        for (const buildPackage of this.packages) {
            const installed = await buildPackage.checkInstall();
            if (installed !== true) {
                errors.push(...installed);
            }
        }
        if (errors.length > 0) {
            return errors;
        }
        return true;
    }
    /**
     * The package manager used to manage this package. This is an async operation.
     */
    // async getPackageManager(): Promise<IPackageManager> {
    // 	const r = await detectPackageManager(this.directory);
    // 	if (r === undefined) {
    // 		throw new Error("No package manager found.");
    // 	}
    // 	if (r.warnings !== undefined) {
    // 		throw new Error(r.warnings.join("/n"));
    // 	}
    // 	return r;
    // }
    /**
     * {@inheritDoc Installable.install}
     */
    /**
     * {@inheritDoc Installable.install}
     */
    async install(updateLockfile) {
        const commandArgs = this.packageManager.getInstallCommandWithArgs(updateLockfile);
        const output = await execa(this.packageManager.name.toString(), commandArgs, {
            cwd: this.directory,
        });
        if (output.exitCode !== 0) {
            return false;
        }
        return true;
    }
    /**
     * Synchronously reload all of the packages in the workspace.
     */
    reload() {
        for (const pkg of this.packages) {
            pkg.reload();
        }
    }
    toString() {
        return `${this.name} (WORKSPACE)`;
    }
    /**
     * Load a workspace from a {@link WorkspaceDefinition}.
     *
     * @param name - The name of the workspace.
     * @param definition - The definition for the workspace.
     * @param root - The path to the root of the workspace.
     * @param buildProject - The build project that the workspace belongs to.
     * @returns A loaded {@link IWorkspace}.
     */
    static load(name, definition, root, buildProject) {
        const workspace = new Workspace(name, definition, root, buildProject);
        return workspace;
    }
}
//# sourceMappingURL=workspace.js.map