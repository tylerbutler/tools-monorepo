"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomInt = exports.compareNumbers = void 0;
exports.countTreeNodeStats = countTreeNodeStats;
exports.logTreeNodeStats = logTreeNodeStats;
exports.randInt = randInt;
exports.expectTreeEqualTo = expectTreeEqualTo;
exports.addToBoth = addToBoth;
exports.makeArray = makeArray;
exports.buildEntriesFromMap = buildEntriesFromMap;
exports.populateFuzzTrees = populateFuzzTrees;
exports.applyRemovalRunsToTree = applyRemovalRunsToTree;
exports.expectTreeMatchesEntries = expectTreeMatchesEntries;
exports.forEachFuzzCase = forEachFuzzCase;
const b_tree_1 = require("../b+tree");
const mersenne_twister_1 = __importDefault(require("mersenne-twister"));
const rand = new mersenne_twister_1.default(1234);
const compareNumbers = (a, b) => a - b;
exports.compareNumbers = compareNumbers;
function countTreeNodeStats(tree) {
    const root = tree._root;
    if (tree.size === 0 || !root)
        return { total: 0, shared: 0, newUnderfilled: 0, averageLoadFactor: 0 };
    const maxNodeSize = tree.maxNodeSize;
    const minNodeSize = Math.floor(maxNodeSize / 2);
    const visit = (node, ancestorShared, isRoot) => {
        if (!node)
            return { total: 0, shared: 0, newUnderfilled: 0, loadFactorSum: 0 };
        const selfShared = node.isShared === true || ancestorShared;
        const children = node.children;
        const occupancy = children ? children.length : node.keys.length;
        const isUnderfilled = !isRoot && occupancy < minNodeSize;
        const loadFactor = occupancy / maxNodeSize;
        let shared = selfShared ? 1 : 0;
        let total = 1;
        let newUnderfilled = !selfShared && isUnderfilled ? 1 : 0;
        let loadFactorSum = loadFactor;
        if (children) {
            for (const child of children) {
                const stats = visit(child, selfShared, false);
                total += stats.total;
                shared += stats.shared;
                newUnderfilled += stats.newUnderfilled;
                loadFactorSum += stats.loadFactorSum;
            }
        }
        return { total, shared, newUnderfilled, loadFactorSum };
    };
    const result = visit(root, false, true);
    const averageLoadFactor = result.total === 0 ? 0 : result.loadFactorSum / result.total;
    return {
        total: result.total,
        shared: result.shared,
        newUnderfilled: result.newUnderfilled,
        averageLoadFactor
    };
}
function logTreeNodeStats(prefix, stats) {
    if (stats instanceof b_tree_1.BTree)
        stats = countTreeNodeStats(stats);
    const percent = (stats.averageLoadFactor * 100).toFixed(2);
    console.log(`\t${prefix} ${stats.shared}/${stats.total} shared nodes, ` +
        `${stats.newUnderfilled}/${stats.total} underfilled nodes, ${percent}% average load factor`);
}
function randInt(max) {
    return rand.random_int() % max;
}
function expectTreeEqualTo(tree, list) {
    tree.checkValid();
    expect(tree.toArray()).toEqual(list.getArray());
}
function addToBoth(a, b, k, v) {
    expect(a.set(k, v)).toEqual(b.set(k, v));
}
function makeArray(size, randomOrder, spacing = 10, rng) {
    const randomizer = rng ?? rand;
    const useGlobalRand = rng === undefined;
    const randomFloat = () => {
        if (typeof randomizer.random === 'function')
            return randomizer.random();
        return Math.random();
    };
    const randomIntWithMax = (max) => {
        if (max <= 0)
            return 0;
        if (useGlobalRand)
            return randInt(max);
        return Math.floor(randomFloat() * max);
    };
    const keys = [];
    let current = 0;
    for (let i = 0; i < size; i++) {
        current += 1 + randomIntWithMax(spacing);
        keys[i] = current;
    }
    if (randomOrder) {
        for (let i = 0; i < size; i++)
            swap(keys, i, randomIntWithMax(size));
    }
    return keys;
}
const randomInt = (rng, maxExclusive) => Math.floor(rng.random() * maxExclusive);
exports.randomInt = randomInt;
function swap(keys, i, j) {
    const tmp = keys[i];
    keys[i] = keys[j];
    keys[j] = tmp;
}
function buildEntriesFromMap(entriesMap, compareFn = (a, b) => a - b) {
    const entries = Array.from(entriesMap.entries());
    entries.sort((a, b) => compareFn(a[0], b[0]));
    return entries;
}
function populateFuzzTrees(specs, { size, rng, compare, maxNodeSize, minAssignmentsPerKey = 0 }) {
    if (specs.length === 0)
        return [];
    const keys = makeArray(size, true, 1, rng);
    const entriesMaps = specs.map(() => new Map());
    const assignments = new Array(specs.length);
    const requiredAssignments = Math.min(minAssignmentsPerKey, specs.length);
    for (const value of keys) {
        let assignedCount = 0;
        for (let i = 0; i < specs.length; i++) {
            assignments[i] = rng.random() < specs[i].fraction;
            if (assignments[i])
                assignedCount++;
        }
        while (assignedCount < requiredAssignments && specs.length > 0) {
            const index = (0, exports.randomInt)(rng, specs.length);
            if (!assignments[index]) {
                assignments[index] = true;
                assignedCount++;
            }
        }
        for (let i = 0; i < specs.length; i++) {
            if (assignments[i]) {
                specs[i].tree.set(value, value);
                entriesMaps[i].set(value, value);
            }
        }
    }
    return specs.map((spec, index) => {
        let entries = buildEntriesFromMap(entriesMaps[index], compare);
        const removalChance = spec.removalChance ?? 0;
        if (removalChance > 0)
            entries = applyRemovalRunsToTree(spec.tree, entries, removalChance, maxNodeSize, rng);
        return entries;
    });
}
function applyRemovalRunsToTree(tree, entries, removalChance, branchingFactor, rng) {
    if (removalChance <= 0 || entries.length === 0)
        return entries;
    const remaining = [];
    let index = 0;
    while (index < entries.length) {
        const [key, value] = entries[index];
        if (rng.random() < removalChance) {
            tree.delete(key);
            index++;
            while (index < entries.length) {
                const [candidateKey] = entries[index];
                if (rng.random() < (1 / branchingFactor))
                    break;
                tree.delete(candidateKey);
                index++;
            }
        }
        else {
            remaining.push([key, value]);
            index++;
        }
    }
    return remaining;
}
function expectTreeMatchesEntries(tree, entries) {
    let index = 0;
    tree.forEachPair((key, value) => {
        const expected = entries[index++];
        expect([key, value]).toEqual(expected);
    });
    expect(index).toBe(entries.length);
}
function validateFuzzSettings(settings) {
    settings.fractionsPerOOM.forEach(fraction => {
        if (fraction < 0 || fraction > 1)
            throw new Error('fractionsPerOOM values must be between 0 and 1');
    });
    settings.removalChances.forEach(chance => {
        if (chance < 0 || chance > 1)
            throw new Error('removalChances values must be between 0 and 1');
    });
}
function forEachFuzzCase(settings, callback) {
    validateFuzzSettings(settings);
    for (const maxNodeSize of settings.branchingFactors) {
        for (const removalChance of settings.removalChances) {
            const removalLabel = removalChance.toFixed(3);
            for (const oom of settings.ooms) {
                const size = 5 * Math.pow(10, oom);
                for (const fractionA of settings.fractionsPerOOM) {
                    const fractionB = 1 - fractionA;
                    callback({ maxNodeSize, oom, size, fractionA, fractionB, removalChance, removalLabel });
                }
            }
        }
    }
}
