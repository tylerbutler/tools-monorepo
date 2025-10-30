/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import type { PackageJson } from "./types.js";
/**
 * Reads the contents of package.json, applies a transform function to it, then writes the results back to the source
 * file.
 *
 * @param packagePath - A path to a package.json file or a folder containing one. If the path is a directory, the
 * package.json from that directory will be used.
 * @param packageTransformer - A function that will be executed on the package.json contents before writing it
 * back to the file.
 *
 * @remarks
 *
 * The package.json is always sorted using sort-package-json.
 */
export declare function updatePackageJsonFile<J extends PackageJson = PackageJson>(packagePath: string, packageTransformer: (json: J) => void): void;
/**
 * Reads a package.json file from a path, detects its indentation, and returns both the JSON as an object and
 * indentation.
 */
export declare function readPackageJsonAndIndent<J extends PackageJson = PackageJson>(pathToJson: string): [json: J, indent: string];
/**
 * Writes a PackageJson object to a file using the provided indentation.
 */
export declare function writePackageJson<J extends PackageJson = PackageJson>(packagePath: string, pkgJson: J, indent: string): void;
/**
 * Reads the contents of package.json, applies a transform function to it, then writes
 * the results back to the source file.
 *
 * @param packagePath - A path to a package.json file or a folder containing one. If the
 * path is a directory, the package.json from that directory will be used.
 * @param packageTransformer - A function that will be executed on the package.json
 * contents before writing it back to the file.
 *
 * @remarks
 * The package.json is always sorted using sort-package-json.
 */
export declare function updatePackageJsonFileAsync<J extends PackageJson = PackageJson>(packagePath: string, packageTransformer: (json: J) => Promise<void>): Promise<void>;
//# sourceMappingURL=packageJsonUtils.d.ts.map