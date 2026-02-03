"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkLoad = bulkLoad;
exports.bulkLoadRoot = bulkLoadRoot;
const b_tree_1 = __importStar(require("../b+tree"));
const shared_1 = require("./shared");
/**
 * Loads a B-Tree from a sorted list of entries in bulk. This is faster than inserting
 * entries one at a time, and produces a more optimally balanced tree.
 * Time and space complexity: O(n).
 * @param keys Keys to load, sorted in strictly ascending order.
 * @param values Values corresponding to each key.
 * @param maxNodeSize The branching factor (maximum node size) for the resulting tree.
 * @param compare Function to compare keys.
 * @param loadFactor Desired load factor for created leaves. Must be between 0.5 and 1.0.
 * @returns A new BTree containing the given entries.
 * @throws Error if the entries are not sorted by key in strictly ascending order (duplicates disallowed) or if the load factor is out of the allowed range.
 */
function bulkLoad(keys, values, maxNodeSize, compare, loadFactor = 0.8) {
    const root = bulkLoadRoot(keys, values, maxNodeSize, compare, loadFactor);
    const tree = new b_tree_1.default(undefined, compare, maxNodeSize);
    const target = tree;
    target._root = root;
    return tree;
}
/**
 * Bulk loads, returns the root node of the resulting tree.
 * @internal
 */
function bulkLoadRoot(keys, values, maxNodeSize, compare, loadFactor = 0.8) {
    if (loadFactor < 0.5 || loadFactor > 1.0)
        throw new Error("bulkLoad: loadFactor must be between 0.5 and 1.0");
    if (keys.length !== values.length)
        throw new Error("bulkLoad: keys and values arrays must be the same length");
    maxNodeSize = (0, b_tree_1.fixMaxSize)(maxNodeSize);
    // Verify keys are sorted
    const totalPairs = keys.length;
    if (totalPairs > 1) {
        let previousKey = keys[0];
        for (let i = 1; i < totalPairs; i++) {
            const key = keys[i];
            if (compare(previousKey, key) >= 0)
                throw new Error("bulkLoad: keys must be sorted in strictly ascending order");
            previousKey = key;
        }
    }
    // Get ALL the leaf nodes with which the tree will be populated
    let currentNodes = [];
    (0, shared_1.makeLeavesFrom)(keys, values, maxNodeSize, loadFactor, currentNodes.push.bind(currentNodes));
    if (currentNodes.length === 0)
        return new b_tree_1.BNode();
    const targetNodeSize = Math.ceil(maxNodeSize * loadFactor);
    const isExactlyHalf = targetNodeSize === maxNodeSize / 2;
    const minSize = Math.floor(maxNodeSize / 2);
    for (let nextLevel; currentNodes.length > 1; currentNodes = nextLevel) {
        const nodeCount = currentNodes.length;
        if (nodeCount <= maxNodeSize && (nodeCount !== maxNodeSize || !isExactlyHalf)) {
            currentNodes = [new b_tree_1.BNodeInternal(currentNodes, (0, b_tree_1.sumChildSizes)(currentNodes))];
            break;
        }
        const nextLevelCount = Math.ceil(nodeCount / targetNodeSize);
        (0, b_tree_1.check)(nextLevelCount > 1);
        nextLevel = new Array(nextLevelCount);
        let remainingNodes = nodeCount;
        let remainingParents = nextLevelCount;
        let childIndex = 0;
        for (let i = 0; i < nextLevelCount; i++) {
            const chunkSize = Math.ceil(remainingNodes / remainingParents);
            const children = new Array(chunkSize);
            let size = 0;
            for (let j = 0; j < chunkSize; j++) {
                const child = currentNodes[childIndex++];
                children[j] = child;
                size += child.size();
            }
            remainingNodes -= chunkSize;
            remainingParents--;
            nextLevel[i] = new b_tree_1.BNodeInternal(children, size);
        }
        // If last node is underfilled, balance with left sibling
        const secondLastNode = nextLevel[nextLevelCount - 2];
        const lastNode = nextLevel[nextLevelCount - 1];
        while (lastNode.children.length < minSize)
            lastNode.takeFromLeft(secondLastNode);
    }
    return currentNodes[0];
}
