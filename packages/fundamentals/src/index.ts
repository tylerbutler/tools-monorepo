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

export { isSorted } from "./array.ts";
export { findGitRootSync } from "./git.ts";
export { addAll } from "./set.ts";
export { KeyAlreadySet, WriteOnceMap } from "./writeOnceMap.ts";
