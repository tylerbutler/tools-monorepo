"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = intersect;
const shared_1 = require("./shared");
const forEachKeyInBoth_1 = __importDefault(require("./forEachKeyInBoth"));
const bulkLoad_1 = require("./bulkLoad");
/**
 * Returns a new tree containing only keys present in both input trees.
 * Neither tree is modified.
 *
 * Complexity is O(N + M) in the fully overlapping case and additionally bounded by O(log(N + M) * D),
 * where `D` is the number of disjoint key ranges, because disjoint subtrees are skipped entirely.
 * In practice, that means for keys of random distribution the performance is linear and for keys with significant
 * numbers of non-overlapping key ranges it is much faster.
 * @param treeA First tree to intersect.
 * @param treeB Second tree to intersect.
 * @param combineFn Called for keys that appear in both trees. Return the desired value.
 * @returns A new tree populated with the intersection.
 * @throws Error if the trees were created with different comparators.
 */
function intersect(treeA, treeB, combineFn) {
    const _treeA = treeA;
    const _treeB = treeB;
    const branchingFactor = (0, shared_1.checkCanDoSetOperation)(_treeA, _treeB, true);
    if (_treeA._root.size() === 0)
        return treeA.clone();
    if (_treeB._root.size() === 0)
        return treeB.clone();
    const intersectedKeys = [];
    const intersectedValues = [];
    (0, forEachKeyInBoth_1.default)(treeA, treeB, (key, leftValue, rightValue) => {
        const mergedValue = combineFn(key, leftValue, rightValue);
        intersectedKeys.push(key);
        intersectedValues.push(mergedValue);
    });
    // Intersected keys are guaranteed to be in order, so we can bulk load
    const constructor = treeA.constructor;
    const resultTree = new constructor(undefined, treeA._compare, branchingFactor);
    resultTree._root = (0, bulkLoad_1.bulkLoadRoot)(intersectedKeys, intersectedValues, branchingFactor, treeA._compare);
    return resultTree;
}
