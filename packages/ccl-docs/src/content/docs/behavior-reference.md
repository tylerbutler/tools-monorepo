---
title: Behavior Reference
description: Detailed guide to CCL implementation behavior choices with examples.
---

CCL implementations must make choices about how to handle certain parsing and access scenarios. These **behaviors** represent options where the CCL specification allows flexibility or where different implementations may reasonably differ.

## How Behaviors Work

Behaviors are tags that describe implementation choices. When running the [CCL test suite](https://github.com/tylerbutler/ccl-test-data), you declare which behaviors your implementation uses, and tests use a `conflicts` field to indicate incompatible behaviors.

```javascript
const capabilities = {
  behaviors: [
    'crlf_normalize_to_lf',
    'boolean_strict',
    'tabs_as_whitespace',
    'array_order_insertion'
  ]
};
```

**Important:** Behaviors are not inherently mutually exclusive. A test can require multiple behaviors (e.g., both `tabs_as_whitespace` and `crlf_normalize_to_lf`). The `conflicts` field on individual tests determines what combinations are incompatible. For example, a test expecting lexicographic ordering would have `conflicts: { behaviors: ["array_order_insertion"] }` to skip implementations that preserve insertion order.

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

**Options:** `tabs_as_content` vs `tabs_as_whitespace`

Controls how tab characters are processed during parsing.

#### `tabs_as_content`

Tab characters are preserved as literal content in values. A leading tab in a value remains as `\t` in the parsed output.

```ccl
key = 	value	with	tabs
```

**Result:** The value contains literal tab characters: `"\tvalue\twith\ttabs"`.

#### `tabs_as_whitespace`

Tab characters are treated as whitespace and normalized (typically to spaces or stripped). Tabs in values are converted to spaces.

```ccl
key = 	value	with	tabs
```

**Result:** The value has tabs converted: `"value with tabs"`.

**Recommendation:** `tabs_as_content` preserves exact input fidelity; `tabs_as_whitespace` provides consistent behavior regardless of tab usage.

---

### Indentation Style

**Options:** `indent_spaces` vs `indent_tabs`

Controls how indentation is rendered in output functions like `canonical_format`.

#### `indent_spaces`

Output uses spaces for indentation (typically 2 spaces per level).

```javascript
canonicalFormat(parsed)
// → "section =\n  child = value"
```

#### `indent_tabs`

Output uses tab characters for indentation.

```javascript
canonicalFormat(parsed)
// → "section =\n\tchild = value"
```

**Note:** This behavior affects output formatting only, not parsing. Most implementations use `indent_spaces` for consistency.

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

### Continuation Baseline

**Options:** `toplevel_indent_strip` vs `toplevel_indent_preserve`

Controls how the baseline indentation (N) is determined during top-level parsing. This affects whether lines at the same indentation level are treated as continuations or separate entries.

#### `toplevel_indent_strip`

Top-level parsing always uses N=0 as the baseline. Any line with indentation > 0 is treated as a continuation of the previous entry. Leading whitespace is effectively "stripped" when determining entry boundaries.

```ccl
  key = value
  next = another
```

**Result:** One entry, because both lines have indent 2 > 0.

```json
{"key": "value\n  next = another"}
```

This is the OCaml reference implementation's behavior.

#### `toplevel_indent_preserve`

Top-level parsing uses the first key's indentation as N. Lines at the same indentation level as the first key are separate entries. The original indentation structure is "preserved" for entry boundary detection.

```ccl
  key = value
  next = another
```

**Result:** Two entries, because both lines have indent 2 = N (2), so 2 > 2 is false.

```json
{"key": "value", "next": "another"}
```

**Trade-offs:**
- `toplevel_indent_strip` matches the OCaml reference and existing test suite expectations
- `toplevel_indent_preserve` may be more intuitive: indenting your whole document doesn't change parsing semantics

**Implementation note:** With `toplevel_indent_preserve`, top-level and nested parsing use the same algorithm—always determine N from the first non-empty line's indentation. The distinction between `parse` and `parse_indented` only matters for `toplevel_indent_strip`, where top-level parsing must force N=0. See [Continuation Lines](/continuation-lines) for details.

**Recommendation:** Use `toplevel_indent_strip` for reference compliance. Consider `toplevel_indent_preserve` if your use case involves documents that may be indented as a whole (e.g., embedded within other files), or if you want a simpler single-algorithm implementation.

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

When building a test runner against the CCL test suite, declare your implementation's behaviors. Tests in the [generated format](https://github.com/tylerbutler/ccl-test-data/blob/main/schemas/generated-format.json) include a `conflicts` field that specifies incompatible behaviors:

```javascript
const capabilities = {
  functions: ['parse', 'build_hierarchy', 'get_string', 'get_bool', 'get_list'],
  features: ['comments'],
  behaviors: [
    'crlf_normalize_to_lf',
    'boolean_strict',
    'tabs_as_whitespace',
    'indent_spaces',
    'list_coercion_disabled',
    'array_order_insertion'
  ],
  variants: ['reference_compliant']
};

// Filter tests based on conflicts field
const compatibleTests = allTests.filter(test => {
  // Skip if test conflicts with any of our declared behaviors
  const hasConflictingBehavior = test.conflicts?.behaviors?.some(b =>
    capabilities.behaviors.includes(b)
  );
  return !hasConflictingBehavior;
});
```

**Note:** The `conflicts` field is per-test, not per-behavior-group. A test that expects `array_order_lexicographic` results would include `conflicts: { behaviors: ["array_order_insertion"] }`.

## Summary Table

| Behavior Group | Option A | Option B | Notes |
|----------------|----------|----------|-------|
| Line Endings | `crlf_preserve_literal` | `crlf_normalize_to_lf` | Preserve for fidelity; normalize for cross-platform |
| Boolean Parsing | `boolean_strict` | `boolean_lenient` | Both are case-insensitive |
| Tab Handling | `tabs_as_content` | `tabs_as_whitespace` | Content preserves exact input |
| Indentation | `indent_spaces` | `indent_tabs` | Output formatting only |
| List Access | `list_coercion_enabled` | `list_coercion_disabled` | Disabled for type safety |
| Continuation Baseline | `toplevel_indent_strip` | `toplevel_indent_preserve` | Strip for reference compliance |
| Array Ordering | `array_order_insertion` | `array_order_lexicographic` | Insertion preserves intent |

## See Also

- [Test Suite Guide](/test-suite-guide/) - Overview of the CCL test suite
- [AI Quickstart](/ai-quickstart/) - Quick reference for AI assistants
- [CCL Test Data Repository](https://github.com/tylerbutler/ccl-test-data) - Full test suite with filtering examples
