/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * An error thrown when a path is not within a Git repository.
 */
export declare class NotInGitRepository extends Error {
    /**
     * The path that was checked and found to be outside a Git repository.
     */
    readonly path: string;
    constructor(
    /**
     * The path that was checked and found to be outside a Git repository.
     */
    path: string);
}
//# sourceMappingURL=errors.d.ts.map