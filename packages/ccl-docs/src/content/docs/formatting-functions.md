---
title: Formatting Functions
description: Understanding CCL's two formatting functions for structure-preserving and semantic-preserving output.
---

CCL provides two distinct formatting functions that serve different purposes. Understanding when to use each is essential for implementing CCL correctly.

## Overview

| Function | Purpose | Property |
|----------|---------|----------|
| `print` | Standard format | Structure-preserving: `print(parse(x)) == x` for standard inputs |
| `canonical_format` | Model-level format | Semantic-preserving: transforms `key = value` to nested form |

## The `print` Function

**Purpose**: Convert parsed entries back to CCL text format, preserving the original structure.

**Key Property**: For inputs in standard format:
```
print(parse(x)) == x
```

This is an **entry-level isomorphism** - the round-trip preserves the textual structure.

### Example

```ccl
name = Alice
config =
  port = 8080
  debug = true
```

After `parse` and `print`:
```ccl
name = Alice
config =
  port = 8080
  debug = true
```

The structure is preserved exactly.

## The `canonical_format` Function

**Purpose**: Convert to a normalized model-level representation.

**Key Property**: Transforms all values into nested key structures:
```
key = value  →  key =
                  value =
```

This is a **semantic-preserving isomorphism** - no information is lost, but the structure changes to reflect the internal model.

### Why OCaml Uses This

The OCaml CCL implementation represents all data uniformly as nested `KeyMap` structures. This enables:

- Elegant recursion with the `fix` function
- Clean pattern matching
- Uniform data structure throughout

### The Trade-off

With `canonical_format`, these two inputs produce identical output:

```ccl
name = Alice
```

and:

```ccl
name =
  Alice =
```

Both become `{ "name": { "Alice": {} } }` in the model.

## Standard Input Format

A CCL input is in **standard format** when:

1. Keys have exactly one space before and after `=`
2. Nested content uses 2-space indentation per level
3. Line endings are LF only (no CRLF)
4. No extra whitespace before keys or after values

### Examples

**Standard format**:
```ccl
key = value
nested =
  child = value
```

**Non-standard** (extra spaces):
```ccl
key  =  value
  nested =
```

## Round-Trip Testing

Use `round_trip` to verify the isomorphism property:

```
parse(print(parse(x))) == parse(x)
```

This verifies that `print` followed by `parse` produces identical entries to the original parse.

## Implementation Guidance

### For Structure-Preserving `print`

Implementations need to track whether a value was originally a string or nested structure. Options:

1. **Leaf flag**: Mark nodes that were originally string values
2. **Original value storage**: Keep raw string alongside children
3. **Entry preservation**: Keep original entry list, build hierarchy on-demand

### Recommended Approach

For new implementations, use a **tagged union** type:

```pseudocode
type Value =
  | String(string)
  | Object(map<string, Value>)
  | List(list<Value>)
```

This makes `print` straightforward to implement while still supporting `canonical_format` when needed.

## Test Suite Coverage

The [CCL Test Suite](https://github.com/tylerbutler/ccl-test-data) includes tests for both formats:

- **`print` tests**: Verify structure-preserving output for standard inputs
- **`round_trip` tests**: Verify the isomorphism property
- **Algebraic property tests**: Verify monoid properties (associativity, identity)

See [Test Suite Guide](/test-suite-guide) for filtering by function.
