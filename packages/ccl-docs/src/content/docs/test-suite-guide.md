---
title: Test Suite Guide
description: Using the CCL test suite for progressive implementation validation.
---

The [CCL Test Suite](https://github.com/tylerbutler/ccl-test-data) provides 375 assertions across 180 tests for validating CCL implementations.

## Test Format

Implementers use the **flat format** in `generated_tests/` - one test per validation function with typed fields for filtering.

### Test Structure

Each test includes:
- `validation`: Function being tested (`parse`, `build_hierarchy`, etc.)
- `functions`: Array of required CCL functions
- `features`: Array of optional language features
- `behaviors`: Array of implementation behavior choices
- `expected`: Expected result with `count` field for assertion verification
- `input`: CCL text to parse

### Test Metadata

**Functions** - CCL functions by category:
- **Core**: `parse`, `build_hierarchy`
- **Typed Access**: `get_string`, `get_int`, `get_bool`, `get_float`, `get_list`
- **Processing**: `filter`, `compose`, `expand_dotted`
- **Formatting**: `canonical_format`

**Features** - Optional language features:
- `comments`, `experimental_dotted_keys`, `empty_keys`, `multiline`, `unicode`, `whitespace`

**Behaviors** - Implementation choices (mutually exclusive):
- `crlf_preserve_literal` vs `crlf_normalize_to_lf`
- `boolean_strict` vs `boolean_lenient`
- `list_coercion_enabled` vs `list_coercion_disabled`

## Progressive Implementation

### Phase 1: Core Parsing
**Validation**: `parse`

Filter tests:
```javascript
tests.filter(t => t.validation === 'parse')
```

### Phase 2: Object Construction
**Validation**: `build_hierarchy`

Filter tests:
```javascript
tests.filter(t => t.validation === 'build_hierarchy')
```

### Phase 3: Typed Access
**Validation**: `get_string`, `get_int`, `get_bool`, `get_float`, `get_list`

Filter tests:
```javascript
tests.filter(t => t.validation.startsWith('get_'))
```

### Phase 4: Optional Features
**Features**: `comments`, `experimental_dotted_keys`

Filter by supported features:
```javascript
tests.filter(t => t.features.every(f => supportedFeatures.includes(f)))
```

## Test Filtering

Filter tests by implementation capabilities:

```javascript
const supportedTests = tests.filter(test => {
  // Check functions
  if (!test.functions.every(f => implementedFunctions.includes(f))) return false;

  // Check features
  if (!test.features.every(f => supportedFeatures.includes(f))) return false;

  // Check behavior conflicts
  if (test.conflicts?.behaviors?.some(b => chosenBehaviors.includes(b))) return false;

  return true;
});
```

## Example Test

```json
{
  "name": "basic_key_value_pairs_parse",
  "validation": "parse",
  "input": "name = Alice\nage = 42",
  "expected": {
    "count": 2,
    "entries": [
      {"key": "name", "value": "Alice"},
      {"key": "age", "value": "42"}
    ]
  },
  "functions": ["parse"],
  "features": [],
  "behaviors": []
}
```

See [CCL Test Suite](https://github.com/tylerbutler/ccl-test-data) repository for complete test runner and JSON schema.
