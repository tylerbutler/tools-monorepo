---
title: Library Features
description: Optional convenience APIs for type-safe access, entry processing, and formatting in CCL implementations.
---

# Library Features (Optional)

:::note[Core vs Library Features]
**Core CCL** requires only `parse` and `build_hierarchy`. Everything in this document is **optional library convenience** built on top of Core CCL. Implementations can adapt these features to their language idioms.
:::

## Type-Safe Value Access

CCL values are always strings. Type conversion is a library convenience, not part of Core CCL.

**Common Functions**:
- `get_string(config, path...)` - Extract string values
- `get_int(config, path...)` - Parse integers with validation
- `get_bool(config, path...)` - Parse booleans (true/false, yes/no, 1/0)
- `get_list(config, path...)` - Extract lists from empty-key entries

**Example**:
```ccl
app =
  name = MyApp
  port = 8080
  debug = true
```

```pseudocode
name = get_string(config, "app", "name")     // "MyApp"
port = get_int(config, "app", "port")        // 8080
debug = get_bool(config, "app", "debug")     // true
```

## Entry Processing

Manipulate CCL entries for composition and filtering.

**Common Functions**:
- `filter(entries, predicate)` - Remove entries (e.g., comments)
- `compose(entries1, entries2)` - Merge entry lists (Monoid composition)

**Example**:
```ccl
/= Development config
database.host = localhost

/= Production overrides
database.host = prod.db.com
```

```pseudocode
dev_entries = parse(dev_config)
prod_entries = parse(prod_config)
combined = compose(dev_entries, prod_entries)
final_config = build_hierarchy(combined)
```

## Formatting Functions

CCL provides two distinct formatting functions that serve different purposes.

| Function | Purpose | Property |
|----------|---------|----------|
| `print` | Standard format | Structure-preserving: `print(parse(x)) == x` for standard inputs |
| `canonical_format` | Model-level format | Semantic-preserving: transforms `key = value` to nested form |

### The `print` Function

**Purpose**: Convert parsed entries back to CCL text format, preserving the original structure.

**Key Property**: For inputs in standard format:
```
print(parse(x)) == x
```

This is an **entry-level isomorphism** - the round-trip preserves the textual structure.

**Example**:
```ccl
name = Alice
config =
  port = 8080
  debug = true
```

After `parse` and `print`, the structure is preserved exactly.

### The `canonical_format` Function

**Purpose**: Convert to a normalized model-level representation.

**Key Property**: Transforms all values into nested key structures:
```
key = value  →  key =
                  value =
```

This is a **semantic-preserving isomorphism** - no information is lost, but the structure changes to reflect the internal model.

The OCaml CCL implementation uses this approach, representing all data uniformly as nested `KeyMap` structures. This enables elegant recursion with the `fix` function and clean pattern matching.

**Trade-off**: With `canonical_format`, these two inputs produce identical output:

```ccl
name = Alice
```

and:

```ccl
name =
  Alice =
```

Both become `{ "name": { "Alice": {} } }` in the model, so the original structure cannot be recovered.

### Standard Input Format

A CCL input is in **standard format** when:

1. Keys have exactly one space before and after `=`
2. Nested content uses 2-space indentation per level
3. Line endings are LF only (CR characters become part of value content)
4. No extra whitespace before keys or after values

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

### Round-Trip Testing

Use `round_trip` to verify the isomorphism property:

```
parse(print(parse(x))) == parse(x)
```

This verifies that `print` followed by `parse` produces identical entries to the original parse.

### Implementation Guidance

For structure-preserving `print`, implementations need to track whether a value was originally a string or nested structure. Options:

1. **Leaf flag**: Mark nodes that were originally string values
2. **Original value storage**: Keep raw string alongside children
3. **Entry preservation**: Keep original entry list, build hierarchy on-demand

For new implementations, use a **tagged union** type:

```pseudocode
type Value =
  | String(string)
  | Object(map<string, Value>)
  | List(list<Value>)
```

This makes `print` straightforward to implement while still supporting `canonical_format` when needed.

## Experimental Features

Some implementations provide additional experimental features:

**Dotted Representation** (Go implementation):
- Provides dotted access to hierarchical data
- `get_string(config, "database.host")` works for nested structure
- Both `get_string(config, "database.host")` and `get_string(config, "database", "host")` access same data

## Test Suite Coverage

The [CCL Test Suite](https://github.com/tylerbutler/ccl-test-data) provides tests for these features:

- **Type-Safe Access**: 381 assertions (99 tests) - `get_string`, `get_int`, `get_bool`, `get_float`, `get_list`
- **Entry Processing**: 15 assertions (12 tests) - `filter`, `compose`, identity properties
- **Formatting**: `print` and `round_trip` tests verify isomorphism properties
- **Experimental Features**: 22 assertions (10 tests) for dotted representation

See [Test Suite Guide](/test-suite-guide) for progressive implementation roadmap.
