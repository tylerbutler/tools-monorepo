---
title: Behavior Reference
description: Detailed guide to CCL implementation behavior choices with examples.
---

CCL implementations must make choices about how to handle certain parsing and access scenarios. These **behaviors** represent mutually exclusive options where the CCL specification allows flexibility or where different implementations may reasonably differ.

## How Behaviors Work

Each behavior group represents a binary choice. When running the [CCL test suite](https://github.com/tylerbutler/ccl-test-data), you declare which behaviors your implementation uses, and the test runner filters out tests that conflict with your choices.

```javascript
const capabilities = {
  behaviors: [
    'crlf_normalize_to_lf',
    'boolean_strict',
    'array_order_insertion'
  ]
};
```

Tests that require conflicting behaviors (e.g., `crlf_preserve_literal` when you've chosen `crlf_normalize_to_lf`) are automatically skipped.

## Behavior Groups

### Line Endings

**Options:** `crlf_preserve_literal` vs `crlf_normalize_to_lf`

Controls how Windows-style line endings (CRLF, `\r\n`) are handled during parsing.

#### `crlf_normalize_to_lf`

Converts all CRLF sequences to LF (`\n`) before or during parsing. This is the most common choice for cross-platform compatibility.

```ccl
key = value\r\n
nested = \r\n
  child = data\r\n
```

**Result:** The `\r` characters are stripped, values contain only `\n`.

```json
{"key": "value", "nested": {"child": "data"}}
```

#### `crlf_preserve_literal`

Preserves `\r` characters exactly as they appear in the input. Values may contain literal carriage return characters.

```ccl
key = value\r\n
```

**Result:** The value includes the `\r` character.

```json
{"key": "value\r"}
```

**Recommendation:** Be consistent with your line ending handling. Both options have valid use cases: `crlf_preserve_literal` maintains exact fidelity (important for round-tripping or when carriage returns are meaningful), while `crlf_normalize_to_lf` simplifies cross-platform handling. When in doubt, preserving is the safer default. This is a good candidate for exposing as a configuration option to library consumers.

---

### Boolean Parsing

**Options:** `boolean_lenient` vs `boolean_strict`

Controls which string values are accepted as booleans by typed access functions like `get_bool`.

#### `boolean_strict`

Only accepts `true` and `false` as boolean values, but comparison is case-insensitive (so `True`, `FALSE`, `tRuE` are all valid).

```ccl
enabled = true
disabled = False
valid = TRUE
active = yes
```

```javascript
getBool(obj, "enabled")   // → true
getBool(obj, "disabled")  // → false
getBool(obj, "valid")     // → true
getBool(obj, "active")    // → ERROR: "yes" is not a valid boolean
```

#### `boolean_lenient`

Accepts additional truthy/falsy values beyond `true`/`false`. All comparisons are case-insensitive.

| Truthy Values | Falsy Values |
|---------------|--------------|
| `true`, `yes`, `on`, `1` | `false`, `no`, `off`, `0` |

Any case variation is accepted (e.g., `YES`, `No`, `TRUE`, `oFf`).

```ccl
enabled = yes
disabled = no
active = on
inactive = off
```

```javascript
getBool(obj, "enabled")   // → true
getBool(obj, "disabled")  // → false
getBool(obj, "active")    // → true
getBool(obj, "inactive")  // → false
```

**Note:** Both modes accept `true` and `false`. The difference is whether additional values like `yes`/`no` are also accepted.

**Recommendation:** Use `boolean_strict` for stricter validation, `boolean_lenient` for more user-friendly configuration files.

---

### Tab Handling

**Options:** `tabs_preserve` vs `tabs_to_spaces`

Controls how tab characters are processed during parsing.

#### `tabs_preserve`

Tab characters are kept as-is in values and contribute their full visual width to indentation calculation. This means a tab might count as multiple spaces worth of indentation depending on tab stop settings.

```ccl
key = \tindented value
nested =
\tchild = data
```

**Result:** Tab characters remain in the parsed output and may affect indentation level calculations differently than single spaces.

#### `tabs_to_spaces`

Tab characters are treated as equivalent to a single space for indentation purposes. The `\t` and ` ` characters have the same width when calculating indentation levels.

```ccl
nested =
\tchild = data
 other = value
```

**Result:** Both `child` and `other` are at the same indentation level (one character deep).

**Recommendation:** `tabs_to_spaces` provides consistent indentation behavior regardless of editor tab width settings.

---

### Whitespace Sensitivity

**Options:** `strict_spacing` vs `loose_spacing`

Controls how whitespace around the `=` delimiter is handled.

#### `strict_spacing`

Requires exactly one space before and after `=`. Extra spaces are considered part of the key or value.

```ccl
key = value
key  = value
```

In strict mode, `key  = value` might parse as key `key ` (with trailing space) or produce an error.

#### `loose_spacing`

Trims whitespace around the `=` delimiter, allowing flexible formatting.

```ccl
key = value
key  =  value
key=value
```

All three lines parse identically as `{"key": "value"}`.

**Recommendation:** `loose_spacing` is more forgiving for human-edited files.

---

### List Coercion

**Options:** `list_coercion_enabled` vs `list_coercion_disabled`

Controls how `get_list` behaves when accessing a single value (non-list).

#### `list_coercion_enabled`

When `get_list` accesses a single value, it wraps it in a list automatically.

```ccl
single = value
multiple =
  = item1
  = item2
```

```javascript
getList(obj, "single")    // → ["value"] (coerced to list)
getList(obj, "multiple")  // → ["item1", "item2"]
```

#### `list_coercion_disabled`

`get_list` only succeeds on actual list values. Single values cause an error.

```javascript
getList(obj, "single")    // → ERROR: not a list
getList(obj, "multiple")  // → ["item1", "item2"]
```

**Recommendation:** `list_coercion_disabled` provides stricter type safety; `list_coercion_enabled` is more convenient for optional list fields.

---

### Array Ordering

**Options:** `array_order_insertion` vs `array_order_lexicographic`

Controls the order of elements when building arrays/lists from CCL entries.

#### `array_order_insertion`

Elements appear in the order they were defined in the source file (insertion order).

```ccl
items =
  = cherry
  = apple
  = banana
```

```javascript
getList(obj, "items")  // → ["cherry", "apple", "banana"]
```

#### `array_order_lexicographic`

Elements are sorted lexicographically (alphabetically) regardless of source order.

```ccl
items =
  = cherry
  = apple
  = banana
```

```javascript
getList(obj, "items")  // → ["apple", "banana", "cherry"]
```

**Recommendation:** `array_order_insertion` preserves author intent; `array_order_lexicographic` provides deterministic output regardless of source formatting.

---

## Declaring Behaviors in Test Runners

When building a test runner against the CCL test suite, declare your implementation's behaviors:

```javascript
const capabilities = {
  functions: ['parse', 'build_hierarchy', 'get_string', 'get_bool', 'get_list'],
  features: ['comments'],
  behaviors: [
    'crlf_normalize_to_lf',
    'boolean_strict',
    'tabs_to_spaces',
    'loose_spacing',
    'list_coercion_disabled',
    'array_order_insertion'
  ],
  variants: ['reference_compliant']
};

// Filter tests to only those compatible with your implementation
const compatibleTests = allTests.filter(test => {
  const hasConflictingBehavior = test.conflicts?.behaviors?.some(b =>
    capabilities.behaviors.includes(b)
  );
  return !hasConflictingBehavior;
});
```

## Summary Table

| Behavior Group | Option A | Option B | Recommendation |
|----------------|----------|----------|----------------|
| Line Endings | `crlf_preserve_literal` | `crlf_normalize_to_lf` | Preserve when in doubt; consider exposing as option |
| Boolean Parsing | `boolean_strict` | `boolean_lenient` | Depends on use case (both are case-insensitive) |
| Tab Handling | `tabs_preserve` | `tabs_to_spaces` | Spaces for consistent indentation |
| Whitespace | `strict_spacing` | `loose_spacing` | Loose for human-edited files |
| List Access | `list_coercion_enabled` | `list_coercion_disabled` | Disabled for type safety |
| Array Ordering | `array_order_insertion` | `array_order_lexicographic` | Insertion preserves intent |

## See Also

- [Test Suite Guide](./test-suite-guide) - Overview of the CCL test suite
- [AI Quickstart](./ai-quickstart) - Quick reference for AI assistants
- [CCL Test Data Repository](https://github.com/tylerbutler/ccl-test-data) - Full test suite with filtering examples
