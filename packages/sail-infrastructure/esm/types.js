/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * A type guard that returns `true` if the checked item is an {@link IReleaseGroup}.
 */
export function isIReleaseGroup(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
toCheck) {
    if (!("name" in toCheck)) {
        return false;
    }
    if (typeof toCheck === "object") {
        // TODO: is there a better way to implement a type guard than unique names of properties? Maybe something with the
        // opaque types?
        return "workspace" in toCheck && "packages" in toCheck;
    }
    return false;
}
/**
 * A type guard that returns `true` if the item is an {@link IPackage}.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types -- this is a type guard
export function isIPackage(pkg) {
    if (typeof pkg === "object") {
        return "getScript" in pkg;
    }
    return false;
}
//# sourceMappingURL=types.js.map