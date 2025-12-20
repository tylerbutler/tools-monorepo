---
title: Test Suite Guide
description: Using the CCL test suite for progressive implementation validation.
---

The [CCL Test Suite](https://github.com/tylerbutler/ccl-test-data) provides 447 assertions across 205 tests for validating CCL implementations.

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
- **Formatting**: `print`, `canonical_format`, `round_trip`
- **Algebraic Properties**: `compose_associative`, `identity_left`, `identity_right`

**Features** - Optional language features:
- `comments`, `experimental_dotted_keys`, `empty_keys`, `multiline`, `unicode`, `whitespace`

**Behaviors** - Implementation choices (exclusivity defined per-test via `conflicts` field):

| Behavior Group | Options | Description |
|----------------|---------|-------------|
| Line Endings | `crlf_preserve_literal` vs `crlf_normalize_to_lf` | CRLF handling: preserve `\r` chars vs normalize to LF |
| Boolean Parsing | `boolean_lenient` vs `boolean_strict` | Accept "yes"/"no" vs only "true"/"false" |
| Tab Handling | `tabs_as_content` vs `tabs_as_whitespace` | Preserve tabs literally vs treat as whitespace |
| Indentation | `indent_spaces` vs `indent_tabs` | Output formatting style |
| List Access | `list_coercion_enabled` vs `list_coercion_disabled` | List access coercion behavior |
| Array Ordering | `array_order_insertion` vs `array_order_lexicographic` | Preserve insertion order vs sort lexicographically |

See the [Behavior Reference](/behavior-reference/) for detailed documentation of each behavior.

## Filtering Tests by Function

### Core Parsing

**`parse`** - Filter tests:
```javascript
tests.filter(t => t.validation === 'parse')
```

**`build_hierarchy`** - Filter tests:
```javascript
tests.filter(t => t.validation === 'build_hierarchy')
```

### Typed Access

**`get_string`, `get_int`, `get_bool`, `get_float`, `get_list`** - Filter tests:
```javascript
tests.filter(t => t.validation.startsWith('get_'))
```

### Formatting

**`print`, `round_trip`** - Filter tests:
```javascript
tests.filter(t => t.validation === 'print' || t.validation === 'round_trip')
```

The `print` function verifies structure-preserving output. For inputs in standard format (single space around `=`, 2-space indentation), `print(parse(x)) == x`.

### Algebraic Properties

**`compose_associative`, `identity_left`, `identity_right`** - These tests use multiple inputs to verify monoid properties:
```javascript
tests.filter(t => ['compose_associative', 'identity_left', 'identity_right'].includes(t.validation))
```

### Optional Features

Filter by supported features (`comments`, `experimental_dotted_keys`, etc.):
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
