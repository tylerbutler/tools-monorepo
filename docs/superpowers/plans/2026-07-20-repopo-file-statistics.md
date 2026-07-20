# Repopo File Statistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct Repopo's file statistics and prevent empty Git/stdin records from entering policy processing.

**Architecture:** Add one pure internal parser for Git/stdin file lists and route both command input paths through it. Keep statistics file-based by incrementing `processed` once after a candidate passes global exclusions, independent of policy matches or policy instance count.

**Tech Stack:** TypeScript, OCLIF, Effection, Vitest, Nx, pnpm, Biome

---

### Task 1: Normalize Git and stdin file lists

**Files:**
- Create: `packages/repopo/src/filePaths.ts`
- Create: `packages/repopo/test/filePaths.test.ts`
- Modify: `packages/repopo/src/commands/check.ts:8-17,110-147`

- [ ] **Step 1: Write the failing parser tests**

Create `packages/repopo/test/filePaths.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { parseFilePaths } from "../src/filePaths.js";

describe("parseFilePaths", () => {
	it.each([
		{ name: "empty input", input: "", expected: [] },
		{
			name: "trailing LF",
			input: "src/one.ts\nsrc/two.ts\n",
			expected: ["src/one.ts", "src/two.ts"],
		},
		{
			name: "trailing CRLF",
			input: "src/one.ts\r\nsrc/two.ts\r\n",
			expected: ["src/one.ts", "src/two.ts"],
		},
		{
			name: "empty records and Windows separators",
			input: "src\\one.ts\n\nsrc\\two.ts\n",
			expected: ["src/one.ts", "src/two.ts"],
		},
	])("parses $name", ({ input, expected }) => {
		expect(parseFilePaths(input)).toEqual(expected);
	});
});
```

- [ ] **Step 2: Run the parser tests and verify they fail**

Run:

```bash
pnpm nx run repopo:test:vitest -- --run test/filePaths.test.ts
```

Expected: FAIL because `../src/filePaths.js` does not exist.

- [ ] **Step 3: Implement the parser**

Create `packages/repopo/src/filePaths.ts`:

```typescript
export function parseFilePaths(input: string): string[] {
	return input
		.replace(/\\/g, "/")
		.split(/\r?\n/)
		.filter((filePath) => filePath.length > 0);
}
```

- [ ] **Step 4: Route both command input paths through the parser**

Add this import to `packages/repopo/src/commands/check.ts`:

```typescript
import { parseFilePaths } from "../filePaths.js";
```

Replace the stdin normalization block with:

```typescript
if (stdInput !== undefined && stdInput !== null) {
	return parseFilePaths(stdInput);
}
```

Replace the Git output normalization block with:

```typescript
return parseFilePaths(gitFiles);
```

- [ ] **Step 5: Run the parser tests and verify they pass**

Run:

```bash
pnpm nx run repopo:test:vitest -- --run test/filePaths.test.ts
```

Expected: PASS with four parser cases.

- [ ] **Step 6: Commit input normalization**

```bash
git add packages/repopo/src/filePaths.ts packages/repopo/src/commands/check.ts packages/repopo/test/filePaths.test.ts
git commit -m "fix(repopo): normalize file list input"
```

### Task 2: Correct file-level processing statistics

**Files:**
- Modify: `packages/repopo/src/perf.ts:11-19`
- Modify: `packages/repopo/src/runner.ts:98-123`
- Modify: `packages/repopo/test/runner.test.ts:27-132`

- [ ] **Step 1: Strengthen the empty and fully processed assertions**

In `packages/repopo/test/runner.test.ts`, add the `processed` assertions:

```typescript
it("should return empty results for no files", async () => {
	const runner = new PolicyRunner(makeRunnerOptions());
	const results = await run(() => runner.run([]));
	expect(results.results).toEqual([]);
	expect(results.perfStats.count).toBe(0);
	expect(results.perfStats.processed).toBe(0);
});

it("should count candidates admitted past global exclusions as processed", async () => {
	const runner = new PolicyRunner(makeRunnerOptions());
	const results = await run(() => runner.run(["a.txt", "b.txt", "c.txt"]));
	expect(results.perfStats.count).toBe(3);
	expect(results.perfStats.processed).toBe(3);
});
```

- [ ] **Step 2: Add all-excluded and mixed-input assertions**

Extend the existing global exclusion test with:

```typescript
expect(results.perfStats.count).toBe(1);
expect(results.perfStats.processed).toBe(0);
```

Add this test in the `exclusion logic` describe block:

```typescript
it("should count mixed processed and globally excluded files", async () => {
	const runner = new PolicyRunner(
		makeRunnerOptions({
			excludeFromAll: [/generated/],
		}),
	);

	const results = await run(() =>
		runner.run(["src/index.ts", "generated/output.ts", "README.md"]),
	);

	expect(results.perfStats.count).toBe(3);
	expect(results.perfStats.processed).toBe(2);
});
```

- [ ] **Step 3: Add duplicate-policy regression coverage**

Add this test in the `run` describe block:

```typescript
it("should count a file once when multiple policy instances process it", async () => {
	let handlerCalls = 0;
	const policyDefinition: PolicyShape = {
		name: "DuplicatePolicy",
		description: "Configured more than once",
		match: /\.txt$/,
		handler: async () => {
			handlerCalls++;
			return true;
		},
	};

	const runner = new PolicyRunner(
		makeRunnerOptions({
			policies: [policy(policyDefinition), policy(policyDefinition)],
		}),
	);

	const results = await run(() => runner.run(["file.txt"]));

	expect(handlerCalls).toBe(2);
	expect(results.perfStats.count).toBe(1);
	expect(results.perfStats.processed).toBe(1);
});
```

- [ ] **Step 4: Run the runner tests and verify they fail**

Run:

```bash
pnpm nx run repopo:test:vitest -- --run test/runner.test.ts
```

Expected: FAIL because `processed` remains zero for admitted files.

- [ ] **Step 5: Document the statistics fields**

Update `PolicyHandlerPerfStats` in `packages/repopo/src/perf.ts`:

```typescript
export interface PolicyHandlerPerfStats {
	/** Number of non-empty candidate file paths supplied to the runner. */
	count: number;
	/** Number of candidate files admitted past global exclusions. */
	processed: number;
	data: Map<PolicyAction, Map<PolicyName, number>>;
}
```

- [ ] **Step 6: Increment processed once per admitted file**

Update `routeToPolicies` in `packages/repopo/src/runner.ts`:

```typescript
private *routeToPolicies(relPath: string): Operation<void> {
	if (this.excludeFromAll.some((regex) => regex.test(relPath))) {
		this.logger?.verbose(`Excluded all handlers: ${relPath}`);
		return;
	}

	this.perfStats.processed++;

	const matchingPolicies = this.policies.filter((policy) =>
		policy.match.test(relPath),
	);
	yield* all(
		matchingPolicies.map((policy) => {
			return this.runPolicyOnFile(relPath, policy);
		}),
	);
}
```

- [ ] **Step 7: Run the runner tests and verify they pass**

Run:

```bash
pnpm nx run repopo:test:vitest -- --run test/runner.test.ts
```

Expected: PASS, including empty, all-excluded, mixed, and duplicate-policy cases.

- [ ] **Step 8: Commit corrected statistics**

```bash
git add packages/repopo/src/perf.ts packages/repopo/src/runner.ts packages/repopo/test/runner.test.ts
git commit -m "fix(repopo): correct file processing statistics"
```

### Task 3: Verify summary output and release metadata

**Files:**
- Modify: `packages/repopo/test/perf.test.ts:46-60`
- Create: `.changeset/fuzzy-files-count.md`

- [ ] **Step 1: Make the summary test represent mixed input**

Replace the first `logStats` test data and expectation in `packages/repopo/test/perf.test.ts`:

```typescript
it("should log statistics summary", () => {
	const logger = createMockLogger();

	const stats: PolicyHandlerPerfStats = {
		count: 3,
		processed: 2,
		data: new Map(),
	};

	logStats(stats, logger);

	expect(logger.log).toHaveBeenCalledWith(
		"Statistics: 2 files processed, 1 excluded, 3 total",
	);
});
```

- [ ] **Step 2: Run all focused regression tests**

Run:

```bash
pnpm nx run repopo:test:vitest -- --run test/filePaths.test.ts test/runner.test.ts test/perf.test.ts
```

Expected: PASS for all three test files.

- [ ] **Step 3: Add the patch changeset**

Create `.changeset/fuzzy-files-count.md`:

```markdown
---
"repopo": patch
---

Correct file processing statistics and ignore empty Git and stdin path records.
```

- [ ] **Step 4: Format the affected project**

Run:

```bash
pnpm nx run repopo:format
```

Expected: SUCCESS; inspect any formatting changes before staging.

- [ ] **Step 5: Run targeted project validation**

Run:

```bash
pnpm nx run repopo:check
pnpm nx run repopo:lint
pnpm nx run repopo:build:compile
pnpm nx run repopo:test:vitest -- --run
```

Expected: all commands succeed.

- [ ] **Step 6: Review the final diff**

Run:

```bash
git status --short
git diff --check
git diff --no-ext-diff origin/main...HEAD
git diff --no-ext-diff
```

Expected: only the design, implementation, tests, and changeset for #777 are present.

- [ ] **Step 7: Commit tests and release metadata**

```bash
git add packages/repopo/test/perf.test.ts .changeset/fuzzy-files-count.md
git commit -m "test(repopo): cover corrected file statistics"
```

### Task 4: Publish the branch and open the pull request

**Files:**
- No repository file changes.

- [ ] **Step 1: Recheck for a competing open pull request**

Run:

```bash
gh search prs --repo tylerbutler/tools-monorepo --state open --limit 50 '777 OR "Correct file processing statistics" OR "input normalization"'
```

Expected: no open PR for #777. If one exists, stop before pushing and compare its scope.

- [ ] **Step 2: Push the issue branch**

Run:

```bash
git push -u origin fix/repopo-file-statistics-777
```

Expected: the remote branch is created successfully.

- [ ] **Step 3: Open the pull request**

Run:

```bash
gh pr create \
	--repo tylerbutler/tools-monorepo \
	--base main \
	--head fix/repopo-file-statistics-777 \
	--title "fix(repopo): correct file processing statistics" \
	--body $'## Summary\n\n- normalize Git and stdin file lists before policy processing\n- count processed files once after global exclusions\n- cover empty, excluded, mixed, and duplicate-policy inputs\n\nFixes #777'
```

Expected: GitHub returns the new pull request URL.
