---
title: AI Assistant Quickstart
description: Guide for AI assistants helping users implement CCL parsers and test runners
---

# CCL Implementation Guide for AI Assistants

> This guide helps AI assistants (Claude, GPT, etc.) quickly understand CCL and help users implement parsers and test runners.

## Quick Facts About CCL

- CCL = Categorical Configuration Language
- Based on category theory (monoid composition)
- **NOT like YAML/JSON** - uses recursive fixed-point parsing
- All identifiers use **snake_case** (never hyphens)
- Key-value pairs are the entire format

## Standard Terminology (Use These Exact Terms)

### Functions (What Implementers Build)

**Core (Required):**
- `parse` - Convert text to flat key-value entries (public API)
- `build_hierarchy` - Build nested objects via recursive parsing (public API)
  - Internally uses `parse_indented` helper (private/internal - strips common leading whitespace before parsing nested values)

**Typed Access (Optional):**
- `get_string`, `get_int`, `get_bool`, `get_float`, `get_list`

**Processing (Optional):**
- `filter` - Remove comment entries (keys starting with `/`)
- `compose` - Monoid composition of entry lists

**Formatting (Optional):**
- `canonical_format` - Standardized output
- `round_trip` - Parse → format → parse identity

### Features (Optional Language Capabilities)

- `comments` - `/=` comment syntax
- `empty_keys` - List items with `= value`
- `multiline` - Multi-line value support
- `unicode` - Unicode content handling
- `whitespace` - Complex whitespace preservation
- `experimental_dotted_keys` - **NOT STANDARD** - experimental only

### Behaviors (Mutually Exclusive Choices)

- `boolean_strict` vs `boolean_lenient`
- `crlf_normalize_to_lf` vs `crlf_preserve_literal`
- `tabs_preserve` vs `tabs_to_spaces`
- `strict_spacing` vs `loose_spacing`
- `list_coercion_enabled` vs `list_coercion_disabled`

### Variants (Specification Versions)

- `proposed_behavior` - Proposed specification behavior
- `reference_compliant` - OCaml reference implementation behavior

## How CCL Differs from YAML/JSON

CCL uses **recursive fixed-point parsing** - fundamentally different from YAML/JSON:

1. **Parse text to flat entries** - Split on first `=`
2. **Build hierarchy from indentation** - Group by indentation level
3. **Recursively parse values** - If value contains `=`, parse it as CCL
4. **Fixed point** - Stop when values are plain strings (no more `=`)

**Example:**
```ccl
database =
  host = localhost
  port = 5432
```

**Parsing steps:**
1. Parse: `Entry("database", "\n  host = localhost\n  port = 5432")`
2. Value contains `=` → parse recursively
3. Result: `{database: {host: "localhost", port: "5432"}}`
4. Fixed point: "localhost" and "5432" have no `=` → done

**Key difference:** YAML/JSON parse structure directly. CCL parses key-value pairs recursively.

## Test Data Format (Flat Format)

Implementers use the **flat format** in `generated_tests/` directory.

**Test Structure:**
```json
{
  "name": "test_name_validation",
  "input": "key = value",
  "validation": "parse",
  "expected": {
    "count": 1,
    "entries": [{"key": "key", "value": "value"}]
  },
  "functions": ["parse"],
  "features": [],
  "behaviors": [],
  "variants": []
}
```

**Key Fields:**
- `validation` - Which CCL function to test
- `functions` - Required functions for this test
- `features` - Required optional features
- `behaviors` - Implementation behavior choices
- `conflicts` - Mutually exclusive options

## Building a Test Runner

### Complete Example (Pseudocode)

```javascript
// 1. Load test data
const tests = JSON.parse(readFile('generated_tests/api_core_ccl_parsing.json'));

// 2. Define implementation capabilities
const capabilities = {
  functions: ['parse', 'build_hierarchy', 'get_string', 'get_int'],
  features: ['comments', 'empty_keys'],
  behaviors: ['crlf_normalize_to_lf', 'boolean_strict'],
  variants: ['reference_compliant']
};

// 3. Filter tests based on capabilities
function isTestSupported(test, capabilities) {
  // All required functions must be implemented
  const functionsOk = test.functions.every(fn =>
    capabilities.functions.includes(fn)
  );

  // All required features must be supported
  const featuresOk = test.features.every(feat =>
    capabilities.features.includes(feat)
  );

  // No conflicting behaviors
  const noConflictingBehaviors = !test.conflicts?.behaviors?.some(b =>
    capabilities.behaviors.includes(b)
  );

  // No conflicting variants
  const noConflictingVariants = !test.conflicts?.variants?.some(v =>
    capabilities.variants.includes(v)
  );

  return functionsOk && featuresOk &&
         noConflictingBehaviors && noConflictingVariants;
}

const supportedTests = tests.filter(t => isTestSupported(t, capabilities));

// 4. Run tests
supportedTests.forEach(test => {
  switch (test.validation) {
    case 'parse':
      const actual = parse(test.input);
      assert.deepEqual(actual, test.expected.entries);
      assert.equal(actual.length, test.expected.count);
      break;

    case 'build_hierarchy':
      const entries = parse(test.input);
      const obj = buildHierarchy(entries);
      assert.deepEqual(obj, test.expected.object);
      break;

    case 'get_string':
      const ccl = buildHierarchy(parse(test.input));
      const value = getString(ccl, ...test.args);
      assert.equal(value, test.expected.value);
      break;

    // ... other validation types
  }
});
```

### Type-Safe Filtering Pattern

```typescript
interface Capabilities {
  functions: string[];
  features: string[];
  behaviors: string[];
  variants: string[];
}

interface Test {
  validation: string;
  functions: string[];
  features: string[];
  behaviors: string[];
  variants: string[];
  conflicts?: {
    behaviors?: string[];
    variants?: string[];
  };
}

function getCompatibleTests(
  tests: Test[],
  capabilities: Capabilities
): Test[] {
  return tests.filter(test => {
    // Direct array operations - no string parsing needed
    const functionsSupported = test.functions.every(fn =>
      capabilities.functions.includes(fn)
    );

    const featuresSupported = test.features.every(feat =>
      capabilities.features.includes(feat)
    );

    const hasConflictingBehavior = test.conflicts?.behaviors?.some(b =>
      capabilities.behaviors.includes(b)
    );

    const hasConflictingVariant = test.conflicts?.variants?.some(v =>
      capabilities.variants.includes(v)
    );

    return functionsSupported && featuresSupported &&
           !hasConflictingBehavior && !hasConflictingVariant;
  });
}
```

## Function-Based Progressive Implementation

Implement CCL functions in this order:

### Stage 1: Core Parsing (Required)
**163 tests for `parse`**
- Split lines on first `=`
- Trim keys, preserve value whitespace
- Handle multiline via indentation

**77 tests for `build_hierarchy`**
- Implement internal `parse_indented` helper (not public API) that strips common leading whitespace from multiline values
- Recursively parse entry values using this helper
- Fixed-point algorithm: stop when values contain no `=`
- Create nested objects from flat entries

### Stage 2: Typed Access (Optional - 84 tests total)
- `get_string` - 7 tests (28 assertions)
- `get_int` - 11 tests (47 assertions)
- `get_bool` - 12 tests (49 assertions)
- `get_float` - 6 tests (28 assertions)
- `get_list` - 48 tests (186 assertions)

### Stage 3: Processing (Optional - 38 tests total)
- `filter` - 3 tests - Remove comment entries
- `compose` - 9 tests - Monoid composition
- `canonical_format` - 14 tests - Standardized output
- `round_trip` - 12 tests - Format → parse identity

### Experimental (NOT Standard Progression)
- Dotted keys - 10 tests - **Explicitly experimental**

## Common AI Assistant Pitfalls

### ❌ Don't Use Hyphens
- Wrong: `build-hierarchy`, `get-string`, `dotted-keys`
- Right: `build_hierarchy`, `get_string`, `experimental_dotted_keys`

### ❌ Don't Confuse Formats
- Source format (`source_tests/`) - For test suite maintainers
- Flat format (`generated_tests/`) - For implementers (use this one)

### ❌ Don't Include Dotted Keys in Standard Progression
- Dotted keys are **experimental**
- Not part of standard CCL implementation path
- Clearly mark as experimental if supporting

### ❌ Don't Use Old Test Counts
- Old: 26/56/135 tests (outdated)
- Old: 452 assertions, 167 tests (outdated)
- Current: 180 tests, 375 assertions

### ❌ Don't Parse Like YAML/JSON
- CCL uses recursive fixed-point parsing
- Fundamentally different algorithm
- See "How CCL Works" section above

## Test Suite Repository

**GitHub:** https://github.com/tylerbutler/ccl-test-data

**Test Files:**
- All in `generated_tests/` directory
- JSON format with typed fields
- Use `.json` extension

**Documentation:**
- Implementation guides in repository README
- Test filtering documentation available
- Progressive implementation roadmap

## Quick Reference Card

```
TERMINOLOGY:     Use snake_case everywhere
FUNCTIONS:       parse, build_hierarchy, get_*, filter, compose
FEATURES:        comments, empty_keys, multiline, unicode, whitespace
EXPERIMENTAL:    experimental_dotted_keys (NOT standard)
FORMAT:          Use flat format (generated_tests/) for implementers
ALGORITHM:       Recursive fixed-point parsing (NOT like YAML/JSON)
TEST COUNTS:     180 tests, 375 assertions (current as of 2025-11-19)
```
