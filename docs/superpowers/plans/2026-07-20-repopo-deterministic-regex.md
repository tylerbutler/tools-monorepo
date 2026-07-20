# Deterministic Repopo Regex Matching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make repopo policy and exclusion regex matching independent of previous paths while preserving global and sticky regex support.

**Architecture:** Add one private matcher helper to `runner.ts`. The helper resets and restores `lastIndex` only for global or sticky regular expressions, and every runner match site uses it.

**Tech Stack:** TypeScript, Effection, Vitest, Nx, pnpm, Biome

---

### Task 1: Add deterministic matching regression tests

**Files:**
- Modify: `packages/repopo/test/runner.test.ts:57-169`

- [ ] **Step 1: Add global exclusion regression tests**

Add this test inside `describe("exclusion logic", ...)`:

```typescript
it.each([
	["global", /.*\.txt$/g],
	["sticky", /.*\.txt$/y],
])(
	"should apply %s global exclusions independently for every file",
	async (_flag, exclusion) => {
		const handledFiles: string[] = [];
		const testPolicy = policy({
			name: "TestPolicy",
			description: "Test",
			match: /\.txt$/,
			handler: async ({ file }) => {
				handledFiles.push(file);
				return true;
			},
		});
		exclusion.lastIndex = 2;

		const runner = new PolicyRunner(
			makeRunnerOptions({
				policies: [testPolicy],
				excludeFromAll: [exclusion],
			}),
		);

		await run(() => runner.run(["a.txt", "b.txt", "c.txt"]));

		expect(handledFiles).toEqual([]);
		expect(exclusion.lastIndex).toBe(2);
	},
);
```

- [ ] **Step 2: Add per-policy exclusion regression tests**

Add this test inside `describe("exclusion logic", ...)`:

```typescript
it.each([
	["global", /.*\.txt$/g],
	["sticky", /.*\.txt$/y],
])(
	"should apply %s per-policy exclusions independently for every file",
	async (_flag, exclusion) => {
		const handledFiles: string[] = [];
		const testPolicy = policy({
			name: "TestPolicy",
			description: "Test",
			match: /\.txt$/,
			handler: async ({ file }) => {
				handledFiles.push(file);
				return true;
			},
		});
		exclusion.lastIndex = 2;

		const runner = new PolicyRunner(
			makeRunnerOptions({
				policies: [testPolicy],
				excludePoliciesForFiles: new Map([
					["TestPolicy", [exclusion]],
				]),
			}),
		);

		await run(() => runner.run(["a.txt", "b.txt", "c.txt"]));

		expect(handledFiles).toEqual([]);
		expect(exclusion.lastIndex).toBe(2);
	},
);
```

- [ ] **Step 3: Add policy matching regression tests**

Add this test inside `describe("policy matching", ...)`:

```typescript
it.each([
	["global", /.*\.txt$/g],
	["sticky", /.*\.txt$/y],
])(
	"should apply %s policy matches independently for every file",
	async (_flag, match) => {
		const matchedFiles: string[] = [];
		const testPolicy = policy({
			name: "TestPolicy",
			description: "Test",
			match,
			handler: async ({ file }) => {
				matchedFiles.push(file);
				return true;
			},
		});
		match.lastIndex = 2;

		const runner = new PolicyRunner(
			makeRunnerOptions({ policies: [testPolicy] }),
		);

		await run(() => runner.run(["a.txt", "b.txt", "c.txt"]));

		expect(matchedFiles).toEqual(["a.txt", "b.txt", "c.txt"]);
		expect(match.lastIndex).toBe(2);
	},
);
```

- [ ] **Step 4: Run the regression tests and verify failure**

Run:

```bash
pnpm nx run repopo:test:vitest -- --run test/runner.test.ts
```

Expected: the six new `global` and `sticky` cases fail because direct `RegExp.test()` calls retain `lastIndex`.

### Task 2: Route runner regex tests through a state-safe helper

**Files:**
- Modify: `packages/repopo/src/runner.ts:19-25`
- Modify: `packages/repopo/src/runner.ts:109-117`
- Modify: `packages/repopo/src/runner.ts:171-176`
- Test: `packages/repopo/test/runner.test.ts`

- [ ] **Step 1: Add the matcher helper**

Add this function after `isOperation`:

```typescript
function matches(regex: RegExp, value: string): boolean {
	if (!regex.global && !regex.sticky) {
		return regex.test(value);
	}

	const lastIndex = regex.lastIndex;
	regex.lastIndex = 0;
	try {
		return regex.test(value);
	} finally {
		regex.lastIndex = lastIndex;
	}
}
```

- [ ] **Step 2: Use the helper for all runner match sites**

Replace the three direct tests with:

```typescript
if (this.excludeFromAll.some((regex) => matches(regex, relPath))) {
```

```typescript
const matchingPolicies = this.policies.filter((policy) =>
	matches(policy.match, relPath),
);
```

```typescript
this.excludePoliciesForFiles
	.get(policy.name)
	?.some((regex) => matches(regex, relPath)) ?? false
```

- [ ] **Step 3: Run the focused tests and verify success**

Run:

```bash
pnpm nx run repopo:test:vitest -- --run test/runner.test.ts
```

Expected: all runner tests pass, including all six new cases.

- [ ] **Step 4: Commit the tested fix**

```bash
git add packages/repopo/src/runner.ts packages/repopo/test/runner.test.ts
git commit -m "fix(repopo): make regex matching deterministic"
```

### Task 3: Add release metadata and validate the package

**Files:**
- Create: `.changeset/calm-regexes-match.md`
- Verify: `packages/repopo/src/runner.ts`
- Verify: `packages/repopo/test/runner.test.ts`

- [ ] **Step 1: Add a patch changeset**

Create `.changeset/calm-regexes-match.md`:

```markdown
---
"repopo": patch
---

Make policy and exclusion regular-expression matching deterministic for global and sticky flags.
```

- [ ] **Step 2: Format the affected project**

Run:

```bash
pnpm nx run repopo:format
```

Expected: Biome completes successfully and changes only files in the repopo project when formatting is needed.

- [ ] **Step 3: Run focused validation**

Run:

```bash
pnpm nx run repopo:test:vitest -- --run test/runner.test.ts
pnpm nx run repopo:build:compile
pnpm nx run repopo:lint
pnpm nx run repopo:check:format
```

Expected: every command exits successfully.

- [ ] **Step 4: Commit the changeset and formatting**

```bash
git add .changeset/calm-regexes-match.md packages/repopo/src/runner.ts packages/repopo/test/runner.test.ts
git commit -m "chore(repopo): add deterministic regex changeset"
```

### Task 4: Publish the branch and open the issue-closing pull request

**Files:**
- Verify: all branch changes relative to `main`

- [ ] **Step 1: Review the branch diff**

Run:

```bash
git status --short --branch
git diff --no-ext-diff --check main...HEAD
git diff --no-ext-diff --stat main...HEAD
```

Expected: the branch contains only the design, plan, runner, runner tests, and changeset changes; the pre-existing `AGENTS.md` modification remains unstaged and absent from the branch diff.

- [ ] **Step 2: Push the branch**

Run:

```bash
git push -u origin fix/repopo-deterministic-regex
```

Expected: GitHub creates or updates the remote branch.

- [ ] **Step 3: Open the pull request**

Run:

```bash
gh pr create \
	--repo tylerbutler/tools-monorepo \
	--base main \
	--head fix/repopo-deterministic-regex \
	--title "fix(repopo): make regex matching deterministic" \
	--body "## Summary

- make global and sticky policy regex matching path-independent
- apply the same handling to global and per-policy exclusions
- preserve caller-owned regex state

Fixes #776"
```

Expected: GitHub opens one pull request that closes issue #776.
