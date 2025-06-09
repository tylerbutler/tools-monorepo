/**
 * Fundamental, zero-dependency functions and classes for common programming tasks.
 *
 * @remarks
 * This package contains utility functions and classes that are frequently needed
 * across projects. All utilities are designed to have zero external dependencies
 * and provide foundational functionality for arrays, sets, git operations, and more.
 *
 * @packageDocumentation
 */

export { isSorted } from "./array.js";
export { findGitRootSync } from "./git.js";
export { addAll } from "./set.js";
export { KeyAlreadySet, WriteOnceMap } from "./writeOnceMap.js";
