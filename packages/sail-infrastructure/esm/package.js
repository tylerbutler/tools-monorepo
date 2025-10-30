/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import { existsSync } from "node:fs";
import * as path from "node:path";
import fsePkg from "fs-extra";
// eslint-disable-next-line import/no-named-as-default-member -- Imports are written this way for CJS/ESM compat
const { readJsonSync } = fsePkg;
import colors from "picocolors";
import { findReleaseGroupForPackage } from "./config.js";
import { readPackageJsonAndIndent, writePackageJson } from "./packageJsonUtils.js";
import { lookUpDirSync } from "./utils.js";
/**
 * A base class for npm packages. A custom type can be used for the package.json schema, which is useful
 * when the package.json has custom keys/values.
 *
 * @typeParam J - The package.json type to use. This type must extend the {@link PackageJson} type defined in this
 * package.
 * @typeParam TAddProps - Additional typed props that will be added to the package object.
 */
export class PackageBase {
    packageJsonFilePath;
    workspace;
    isWorkspaceRoot;
    releaseGroup;
    isReleaseGroupRoot;
    // eslint-disable-next-line @typescript-eslint/prefer-readonly -- false positive; this value is changed
    static packageCount = 0;
    static colorFunction = [
        colors.red,
        colors.green,
        colors.yellow,
        colors.blue,
        colors.magenta,
        colors.cyan,
        colors.white,
        colors.gray,
        colors.redBright,
        colors.greenBright,
        colors.yellowBright,
        colors.blueBright,
        colors.magentaBright,
        colors.cyanBright,
        colors.whiteBright,
    ];
    _indent;
    _packageJson;
    packageId = Package.packageCount++;
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    get color() {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return Package.colorFunction[this.packageId % Package.colorFunction.length];
    }
    /**
     * Create a new package from a package.json file. **Prefer the .load method to calling the contructor directly.**
     *
     * @param packageJsonFilePath - The path to a package.json file.
     * @param packageManager - The package manager used by the workspace.
     * @param isWorkspaceRoot - Set to true if this package is the root of a workspace.
     * @param additionalProperties - An object with additional properties that should be added to the class. This is
     * useful to augment the package class with additional properties.
     */
    constructor(
    /**
     * {@inheritDoc IPackage.packageJsonFilePath}
     */
    packageJsonFilePath, 
    /**
     * {@inheritDoc IPackage.packageManager}
     */
    // public readonly packageManager: IPackageManager,
    /**
     * {@inheritDoc IPackage.workspace}
     */
    workspace, 
    /**
     * {@inheritDoc IPackage.isWorkspaceRoot}
     */
    isWorkspaceRoot, 
    /**
     * {@inheritDoc IPackage.releaseGroup}
     */
    releaseGroup, 
    /**
     * {@inheritDoc IPackage.isReleaseGroupRoot}
     */
    isReleaseGroupRoot, additionalProperties) {
        this.packageJsonFilePath = packageJsonFilePath;
        this.workspace = workspace;
        this.isWorkspaceRoot = isWorkspaceRoot;
        this.releaseGroup = releaseGroup;
        this.isReleaseGroupRoot = isReleaseGroupRoot;
        [this._packageJson, this._indent] = readPackageJsonAndIndent(packageJsonFilePath);
        if (additionalProperties !== undefined) {
            Object.assign(this, additionalProperties);
        }
    }
    /**
     * {@inheritDoc IPackage.combinedDependencies}
     */
    get combinedDependencies() {
        return iterateDependencies(this.packageJson);
    }
    /**
     * {@inheritDoc IPackage.directory}
     */
    get directory() {
        return path.dirname(this.packageJsonFilePath);
    }
    /**
     * {@inheritDoc IPackage.name}
     */
    get name() {
        return this.packageJson.name;
    }
    /**
     * {@inheritDoc IPackage.nameColored}
     */
    get nameColored() {
        return this.color(this.name);
    }
    /**
     * {@inheritDoc IPackage.packageJson}
     */
    get packageJson() {
        return this._packageJson;
    }
    /**
     * {@inheritDoc IPackage.private}
     */
    get private() {
        return this.packageJson.private ?? false;
    }
    /**
     * {@inheritDoc IPackage.version}
     */
    get version() {
        return this.packageJson.version;
    }
    /**
     * {@inheritDoc IPackage.savePackageJson}
     */
    async savePackageJson() {
        writePackageJson(this.packageJsonFilePath, this.packageJson, this._indent);
    }
    /**
     * Reload the package from the on-disk package.json.
     */
    reload() {
        this._packageJson = readJsonSync(this.packageJsonFilePath);
    }
    toString() {
        return `${this.name} (${this.directory})`;
    }
    /**
     * {@inheritDoc IPackage.getScript}
     */
    getScript(name) {
        return this.packageJson.scripts === undefined ? undefined : this.packageJson.scripts[name];
    }
    /**
     * {@inheritDoc Installable.checkInstall}
     */
    async checkInstall() {
        if (this.combinedDependencies.next().done === true) {
            // No dependencies
            return true;
        }
        if (!existsSync(path.join(this.directory, "node_modules"))) {
            return [`${this.nameColored}: node_modules not installed in ${this.directory}`];
        }
        const errors = [];
        for (const dep of this.combinedDependencies) {
            const found = checkDependency(this.directory, dep);
            if (!found) {
                errors.push(`${this.nameColored}: dependency ${dep.name} not found`);
            }
        }
        return errors.length === 0 ? true : errors;
    }
    /**
     * Installs the dependencies for all packages in this package's workspace.
     */
    async install(updateLockfile) {
        return this.workspace.install(updateLockfile);
    }
}
/**
 * A concrete class that is used internally within build-infrastructure as the concrete {@link IPackage} implementation.
 *
 * @typeParam J - The package.json type to use. This type must extend the {@link PackageJson} type defined in this
 * package.
 * @typeParam TAddProps - Additional typed props that will be added to the package object.
 */
class Package extends PackageBase {
    /**
     * Loads an {@link IPackage} from a {@link WorkspaceDefinition}.
     *
     * @param packageJsonFilePath - The path to the package.json for the package being loaded.
     * @param packageManager - The package manager to use.
     * @param isWorkspaceRoot - Set to `true` if the package is a workspace root package.
     * @param workspaceDefinition - The workspace definition.
     * @param workspace - The workspace that this package belongs to.
     * @param additionalProperties - Additional properties that will be added to the package object.
     * @returns A loaded {@link IPackage} instance.
     */
    static loadFromWorkspaceDefinition(packageJsonFilePath, isWorkspaceRoot, workspaceDefinition, workspace, additionalProperties) {
        const packageName = readJsonSync(packageJsonFilePath)
            .name;
        const releaseGroupName = findReleaseGroupForPackage(packageName, workspaceDefinition.releaseGroups);
        if (releaseGroupName === undefined) {
            throw new Error(`Cannot find release group for package '${packageName}'`);
        }
        const releaseGroupDefinition = workspaceDefinition.releaseGroups[releaseGroupName];
        if (releaseGroupDefinition === undefined) {
            throw new Error(`Cannot find release group definition for ${releaseGroupName}`);
        }
        const { rootPackageName } = releaseGroupDefinition;
        const isReleaseGroupRoot = rootPackageName === undefined ? false : packageName === rootPackageName;
        const pkg = new this(packageJsonFilePath, 
        // packageManager,
        workspace, isWorkspaceRoot, releaseGroupName, isReleaseGroupRoot, additionalProperties);
        return pkg;
    }
}
/**
 * Loads an {@link IPackage} from a {@link WorkspaceDefinition}.
 *
 * @param packageJsonFilePath - The path to the package.json for the package being loaded.
 * @param packageManager - The package manager to use.
 * @param isWorkspaceRoot - Set to `true` if the package is a workspace root package.
 * @param workspaceDefinition - The workspace definition.
 * @param workspace - The workspace that this package belongs to.
 * @returns A loaded {@link IPackage} instance.
 */
export function loadPackageFromWorkspaceDefinition(packageJsonFilePath, isWorkspaceRoot, workspaceDefinition, workspace) {
    return Package.loadFromWorkspaceDefinition(packageJsonFilePath, isWorkspaceRoot, workspaceDefinition, workspace);
}
/**
 * A generator function that returns all production, dev, and peer dependencies in package.json.
 *
 * @param packageJson - The package.json whose dependencies should be iterated.
 */
function* iterateDependencies(packageJson) {
    for (const [pkgName, version] of Object.entries(packageJson.dependencies ?? {})) {
        const name = pkgName;
        if (version === undefined) {
            throw new Error(`Dependency found without a version specifier: ${name}`);
        }
        yield {
            name,
            version,
            depKind: "prod",
        };
    }
    for (const [pkgName, version] of Object.entries(packageJson.devDependencies ?? {})) {
        const name = pkgName;
        if (version === undefined) {
            throw new Error(`Dependency found without a version specifier: ${name}`);
        }
        yield {
            name,
            version,
            depKind: "dev",
        };
    }
    for (const [pkgName, version] of Object.entries(packageJson.devDependencies ?? {})) {
        const name = pkgName;
        if (version === undefined) {
            throw new Error(`Dependency found without a version specifier: ${name}`);
        }
        yield {
            name,
            version,
            depKind: "peer",
        };
    }
}
/**
 * Checks if a dependency is installed by looking up the folder tree's node_modules folders and looking for the
 * dependent package. If the dependency's folder in node_modules is found, the dependency is considered installed.
 *
 * @remarks
 *
 * Note that the version of the dependency is _not_ checked.
 */
function checkDependency(packagePath, dependency) {
    const foundDepPath = lookUpDirSync(packagePath, (currentDir) => {
        // TODO: check that the version matches the requested semver range as well
        return existsSync(path.join(currentDir, "node_modules", dependency.name));
    });
    return foundDepPath !== undefined;
}
//# sourceMappingURL=package.js.map