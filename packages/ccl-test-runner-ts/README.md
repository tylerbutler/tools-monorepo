# ccl-test-runner-ts

TypeScript test runner for validating CCL implementations against the [ccl-test-data](https://github.com/tylerbutler/ccl-test-data) test suite.

## Features

- **Zero configuration** - Test data is bundled; no download required
- **Vitest integration** - Declarative API for wiring up your implementation
- **Capability filtering** - Run only tests matching your implementation
- **Type-safe** - Full TypeScript support

## Installation

```bash
npm install ccl-test-runner-ts
```

## Quick Start

Create a test file that wires up your CCL implementation:

```typescript
import { describe, expect, test } from "vitest";
import {
  Behavior,
  Variant,
  createCCLTestCases,
  defineCCLTests,
} from "ccl-test-runner-ts/vitest";
import { parse, buildHierarchy, getString } from "./my-ccl";

export const cclConfig = defineCCLTests({
  name: "my-ccl",
  functions: {
    parse,
    build_hierarchy: buildHierarchy,
    get_string: getString,
  },
  behaviors: [Behavior.BooleanLenient, Behavior.CRLFNormalize],
  variant: Variant.ProposedBehavior,
});

describe("CCL", async () => {
  const { byFunction } = await createCCLTestCases(cclConfig);

  for (const [fn, testEntries] of byFunction) {
    describe(fn, () => {
      for (const { categorization, run } of testEntries) {
        const { testCase } = categorization;

        switch (categorization.type) {
          case "skip":
            test.skip(testCase.name, () => {});
            break;
          case "todo":
            test.todo(testCase.name);
            break;
          case "run":
            test(testCase.name, () => {
              const result = run();
              expect(result.passed).toBe(true);
            });
            break;
        }
      }
    });
  }
});
```

## CCL Function Signatures

Implement functions following these signatures. Functions should **throw** on errors (standard JS/TS pattern).

### Core Functions

```typescript
interface Entry {
  key: string;
  value: string;
}

type CCLObject = Record<string, string | string[] | CCLObject>;

// Parse CCL text to flat key-value entries
function parse(input: string): Entry[]

// Build nested object from flat entries
function build_hierarchy(entries: Entry[]): CCLObject
```

### Typed Access

```typescript
// Get typed values at path - throw if missing or wrong type
function get_string(obj: CCLObject, path: string): string
function get_int(obj: CCLObject, path: string): number
function get_bool(obj: CCLObject, path: string): boolean
function get_float(obj: CCLObject, path: string): number
function get_list(obj: CCLObject, path: string): string[]
```

### Processing Functions

```typescript
// Filter entries by predicate
function filter(entries: Entry[], predicate: (e: Entry) => boolean): Entry[]

// Compose/merge entry lists
function compose(base: Entry[], overlay: Entry[]): Entry[]

// Expand dotted keys (e.g., "a.b" -> nested structure)
function expand_dotted(entries: Entry[]): Entry[]
```

## Configuration

### Behaviors

```typescript
import { Behavior } from "ccl-test-runner-ts/vitest";

behaviors: [
  // Boolean parsing
  Behavior.BooleanStrict,       // Only "true"/"false"
  Behavior.BooleanLenient,      // Also "yes"/"no", "1"/"0"

  // Line endings
  Behavior.CRLFNormalize,       // Normalize CRLF to LF
  Behavior.CRLFPreserve,        // Preserve as-is

  // Whitespace
  Behavior.TabsToSpaces,        // Convert tabs to spaces
  Behavior.TabsPreserve,        // Keep tabs
  Behavior.LooseSpacing,        // Trim whitespace

  // Lists
  Behavior.ListCoercionEnabled,   // Single values coerce to lists
  Behavior.ListCoercionDisabled,  // No coercion
]
```

### Variants

```typescript
import { Variant } from "ccl-test-runner-ts/vitest";

variant: Variant.ProposedBehavior   // Modern spec behavior
variant: Variant.ReferenceCompliant // Strict reference compliance
```

### Features

```typescript
features: [
  "comments",      // /= comment syntax
  "empty_keys",    // Allow empty key names
  "multiline",     // Multiline values
  "unicode",       // Unicode handling
  "whitespace",    // Whitespace handling
]
```

## Test Categorization

Tests are automatically categorized:

- **run** - Requirements met, test executes
- **skip** - Function/feature not supported
- **todo** - Function declared but not implemented

## Custom Test Data

Test data is bundled by default. To use custom data:

```typescript
import { downloadTestData } from "ccl-test-runner-ts";

await downloadTestData({ outputDir: "./my-tests", force: true });

const config = defineCCLTests({
  testDataPath: "./my-tests",
  // ...
});
```

## API Reference

### Main Exports

```typescript
import {
  // Capabilities
  createCapabilities,
  Behavior,
  Variant,

  // Test data
  loadTestData,
  loadAllTests,
  getBundledTestDataPath,

  // Types
  type Entry,
  type CCLObject,
  type TestCase,
} from "ccl-test-runner-ts";
```

### Vitest Integration

```typescript
import {
  defineCCLTests,
  createCCLTestCases,
  getCCLTestSuiteInfo,
  Behavior,
  Variant,
} from "ccl-test-runner-ts/vitest";
```

## License

MIT
