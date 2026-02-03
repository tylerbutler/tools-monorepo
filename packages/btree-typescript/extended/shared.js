"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.branchingFactorErrorMsg = exports.comparatorErrorMsg = void 0;
exports.makeLeavesFrom = makeLeavesFrom;
exports.checkCanDoSetOperation = checkCanDoSetOperation;
const b_tree_1 = require("../b+tree");
/**
 * Builds leaves from the given parallel arrays of entries.
 * The supplied load factor will be respected if possible, but may be exceeded
 * to ensure the 50% full rule is maintained.
 * Note: if < maxNodeSize entries are provided, only one leaf will be created, which may be underfilled.
 * @param keys The list of keys to build leaves from.
 * @param values The list of values to build leaves from.
 * @param maxNodeSize The maximum node size (branching factor) for the resulting leaves.
 * @param onLeafCreation Called when a new leaf is created.
 * @param loadFactor Desired load factor for created leaves. Must be between 0.5 and 1.0.
 * @internal
 */
function makeLeavesFrom(keys, values, maxNodeSize, loadFactor, onLeafCreation) {
    if (keys.length !== values.length)
        throw new Error("makeLeavesFrom: keys and values arrays must be the same length");
    const totalPairs = keys.length;
    if (totalPairs === 0)
        return 0;
    const targetSize = Math.ceil(maxNodeSize * loadFactor);
    // This method creates as many evenly filled leaves as possible from
    // the pending entries. All will be > 50% full if we are creating more than one leaf.
    let remaining = totalPairs;
    let pairIndex = 0;
    let remainingLeaves = totalPairs <= maxNodeSize ? 1 : Math.ceil(totalPairs / targetSize);
    for (; remainingLeaves > 0; remainingLeaves--) {
        const chunkSize = Math.ceil(remaining / remainingLeaves);
        const nextIndex = pairIndex + chunkSize;
        const chunkKeys = keys.slice(pairIndex, nextIndex);
        const chunkVals = values.slice(pairIndex, nextIndex);
        pairIndex = nextIndex;
        remaining -= chunkSize;
        const leaf = new b_tree_1.BNode(chunkKeys, chunkVals);
        onLeafCreation(leaf);
    }
}
;
/**
 * Error message used when comparators differ between trees.
 * @internal
 */
exports.comparatorErrorMsg = "Cannot perform set operations on BTrees with different comparators.";
/**
 * Error message used when branching factors differ between trees.
 * @internal
 */
exports.branchingFactorErrorMsg = "Cannot perform set operations on BTrees with different max node sizes.";
/**
 * Checks that two trees can be used together in a set operation.
 * @internal
 */
function checkCanDoSetOperation(treeA, treeB, supportsDifferentBranchingFactors) {
    if (treeA._compare !== treeB._compare)
        throw new Error(exports.comparatorErrorMsg);
    const branchingFactor = treeA._maxNodeSize;
    if (!supportsDifferentBranchingFactors && branchingFactor !== treeB._maxNodeSize)
        throw new Error(exports.branchingFactorErrorMsg);
    return branchingFactor;
}
