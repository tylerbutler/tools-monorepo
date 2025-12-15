---
title: Library Features
description: Optional convenience APIs for type-safe access and entry processing in CCL implementations.
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

## Experimental Features

Some implementations provide additional experimental features:

**Dotted Representation** (Go implementation):
- Provides dotted access to hierarchical data
- `get_string(config, "database.host")` works for nested structure
- Both `get_string(config, "database.host")` and `get_string(config, "database", "host")` access same data

## Test Suite Coverage

The [CCL Test Suite](https://github.com/tylerbutler/ccl-test-data) provides tests for these features:

- **Type-Safe Access**: 107 assertions (22 tests)
- **Entry Processing**: 67 assertions (19 tests)
- **Experimental Features**: 18 tests for dotted representation

See [Test Suite Guide](/test-suite-guide) for progressive implementation roadmap.
