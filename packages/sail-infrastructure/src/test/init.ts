import * as path from "node:path";

import { _dirname } from "./dirname.cjs";

export const packageRootPath = path.resolve(_dirname, "../..");

/**
 * Absolute path to the test data. It's rooted two directories up because the tests get executed from lib/.
 */
export const testDataPath = path.resolve(
	_dirname,
	packageRootPath,
	"src/test/data",
);

/**
 * Absolute path to the test repo.
 */
export const testRepoRoot = path.join(testDataPath, "testRepo");
