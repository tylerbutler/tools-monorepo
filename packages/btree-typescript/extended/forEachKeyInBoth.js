"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = forEachKeyInBoth;
const shared_1 = require("./shared");
const parallelWalk_1 = require("./parallelWalk");
/**
 * Calls the supplied `callback` for each key/value pair shared by both trees, in sorted key order.
 * Neither tree is modified.
 *
 * Complexity is O(N + M) when the trees overlap heavily, and additionally bounded by O(log(N + M) * D)
 * where `D` is the number of disjoint key ranges between the trees, because whole non-intersecting subtrees
 * are skipped.
 * In practice, that means for keys of random distribution the performance is linear and for keys with significant
 * numbers of non-overlapping key ranges it is much faster.
 * @param treeA First tree to compare.
 * @param treeB Second tree to compare.
 * @param callback Invoked for keys that appear in both trees. It can cause iteration to early exit by returning `{ break: R }`.
 * @returns The first `break` payload returned by the callback, or `undefined` if the walk finishes.
 * @throws Error if the trees were built with different comparators.
 */
function forEachKeyInBoth(treeA, treeB, callback) {
    const _treeA = treeA;
    const _treeB = treeB;
    (0, shared_1.checkCanDoSetOperation)(_treeA, _treeB, true);
    if (treeB.size === 0 || treeA.size === 0)
        return;
    const cmp = treeA._compare;
    const makePayload = () => undefined;
    let cursorA = (0, parallelWalk_1.createCursor)(_treeA, makePayload, parallelWalk_1.noop, parallelWalk_1.noop, parallelWalk_1.noop, parallelWalk_1.noop, parallelWalk_1.noop);
    let cursorB = (0, parallelWalk_1.createCursor)(_treeB, makePayload, parallelWalk_1.noop, parallelWalk_1.noop, parallelWalk_1.noop, parallelWalk_1.noop, parallelWalk_1.noop);
    let leading = cursorA;
    let trailing = cursorB;
    let order = cmp((0, parallelWalk_1.getKey)(leading), (0, parallelWalk_1.getKey)(trailing));
    // This walk is somewhat similar to a merge walk in that it does an alternating hop walk with cursors.
    // However, the only thing we care about is when the two cursors are equal (equality is intersection).
    // When they are not equal we just advance the trailing cursor.
    while (true) {
        const areEqual = order === 0;
        if (areEqual) {
            const key = (0, parallelWalk_1.getKey)(leading);
            const vA = cursorA.leaf.values[cursorA.leafIndex];
            const vB = cursorB.leaf.values[cursorB.leafIndex];
            const result = callback(key, vA, vB);
            if (result && result.break) {
                return result.break;
            }
            const outT = (0, parallelWalk_1.moveForwardOne)(trailing, leading);
            const outL = (0, parallelWalk_1.moveForwardOne)(leading, trailing);
            if (outT && outL)
                break;
            order = cmp((0, parallelWalk_1.getKey)(leading), (0, parallelWalk_1.getKey)(trailing));
        }
        else {
            if (order < 0) {
                const tmp = trailing;
                trailing = leading;
                leading = tmp;
            }
            // At this point, leading is guaranteed to be ahead of trailing.
            const [out, nowEqual] = (0, parallelWalk_1.moveTo)(trailing, leading, (0, parallelWalk_1.getKey)(leading), true, areEqual);
            if (out) {
                // We've reached the end of one tree, so intersections are guaranteed to be done.
                break;
            }
            else if (nowEqual) {
                order = 0;
            }
            else {
                order = -1; // trailing is ahead of leading
            }
        }
    }
}
