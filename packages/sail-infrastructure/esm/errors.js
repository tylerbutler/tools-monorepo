/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * An error thrown when a path is not within a Git repository.
 */
export class NotInGitRepository extends Error {
    path;
    constructor(
    /**
     * The path that was checked and found to be outside a Git repository.
     */
    path) {
        super(`Path is not in a Git repository: ${path}`);
        this.path = path;
    }
}
//# sourceMappingURL=errors.js.map