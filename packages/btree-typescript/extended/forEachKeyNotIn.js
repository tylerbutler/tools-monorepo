"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = forEachKeyNotIn;
const shared_1 = require("./shared");
const parallelWalk_1 = require("./parallelWalk");
/**
 * Calls the supplied `callback` for each key/value pair that is in `includeTree` but not in `excludeTree`
 * (set subtraction). The callback runs in sorted key order and neither tree is modified.
 *
 * Complexity is O(N + M) when the key ranges overlap heavily, and additionally bounded by O(log(N + M) * D)
 * where `D` is the number of disjoint ranges between the trees, because non-overlapping subtrees are skipped.
 * In practice, that means for keys of random distribution the performance is linear and for keys with significant
 * numbers of non-overlapping key ranges it is much faster.
 * @param includeTree The tree to iterate keys from.
 * @param excludeTree Keys present in this tree are omitted from the callback.
 * @param callback Invoked for keys that are in `includeTree` but not `excludeTree`. It can cause iteration to early exit by returning `{ break: R }`.
 * @returns The first `break` payload returned by the callback, or `undefined` if all qualifying keys are visited.
 * @throws Error if the trees were built with different comparators.
 */
function forEachKeyNotIn(includeTree, excludeTree, callback) {
    const _includeTree = includeTree;
    const _excludeTree = excludeTree;
    (0, shared_1.checkCanDoSetOperation)(_includeTree, _excludeTree, true);
    if (includeTree.size === 0) {
        return;
    }
    const cmp = includeTree._compare;
    const makePayload = () => undefined;
    let cursorInclude = (0, parallelWalk_1.createCursor)(_includeTree, makePayload, parallelWalk_1.noop, parallelWalk_1.noop, parallelWalk_1.noop, parallelWalk_1.noop, parallelWalk_1.noop);
    // Handle empty excludeTree case before creating cursorExclude to avoid TDZ issues
    if (excludeTree.size === 0) {
        // Simple iteration through all keys in includeTree
        let out = false;
        do {
            const key = (0, parallelWalk_1.getKey)(cursorInclude);
            const value = cursorInclude.leaf.values[cursorInclude.leafIndex];
            const result = callback(key, value);
            if (result && result.break) {
                return result.break;
            }
            out = (0, parallelWalk_1.moveForwardOne)(cursorInclude, cursorInclude); // Use cursorInclude as dummy for unused 'other' param
        } while (!out);
        return undefined;
    }
    let cursorExclude = (0, parallelWalk_1.createCursor)(_excludeTree, makePayload, parallelWalk_1.noop, parallelWalk_1.noop, parallelWalk_1.noop, parallelWalk_1.noop, parallelWalk_1.noop);
    const finishWalk = () => {
        let out = false;
        do {
            const key = (0, parallelWalk_1.getKey)(cursorInclude);
            const value = cursorInclude.leaf.values[cursorInclude.leafIndex];
            const result = callback(key, value);
            if (result && result.break) {
                return result.break;
            }
            out = (0, parallelWalk_1.moveForwardOne)(cursorInclude, cursorExclude);
        } while (!out);
        return undefined;
    };
    let order = cmp((0, parallelWalk_1.getKey)(cursorInclude), (0, parallelWalk_1.getKey)(cursorExclude));
    while (true) {
        const areEqual = order === 0;
        if (areEqual) {
            // Keys are equal, so this key is in both trees and should be skipped.
            const outInclude = (0, parallelWalk_1.moveForwardOne)(cursorInclude, cursorExclude);
            if (outInclude)
                break;
            order = 1; // include is now ahead of exclude
        }
        else {
            if (order < 0) {
                const key = (0, parallelWalk_1.getKey)(cursorInclude);
                const value = cursorInclude.leaf.values[cursorInclude.leafIndex];
                const result = callback(key, value);
                if (result && result.break) {
                    return result.break;
                }
                const outInclude = (0, parallelWalk_1.moveForwardOne)(cursorInclude, cursorExclude);
                if (outInclude) {
                    break;
                }
                order = cmp((0, parallelWalk_1.getKey)(cursorInclude), (0, parallelWalk_1.getKey)(cursorExclude));
            }
            else {
                // At this point, include is guaranteed to be ahead of exclude.
                const [out, nowEqual] = (0, parallelWalk_1.moveTo)(cursorExclude, cursorInclude, (0, parallelWalk_1.getKey)(cursorInclude), true, areEqual);
                if (out) {
                    // We've reached the end of exclude, so call for all remaining keys in include
                    return finishWalk();
                }
                else if (nowEqual) {
                    order = 0;
                }
                else {
                    order = -1;
                }
            }
        }
    }
}
