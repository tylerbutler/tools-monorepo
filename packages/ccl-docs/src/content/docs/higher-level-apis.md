---
title: Higher-Level APIs
description: Type-safe value access, entry processing, and implementation compatibility for CCL implementations.
---

# CCL Higher-Level APIs

Beyond Core CCL (parse + build_hierarchy), implementations often provide convenient higher-level APIs for common tasks. These APIs are built on top of Core CCL and availability varies by implementation.

## API Categories

### Type-Safe Value Access

**Purpose**: Extract values from CCL config with automatic type conversion and validation

**Core Functions**:
- `get_string(config, path...)` - Extract string values
- `get_int(config, path...)` - Parse and validate integers  
- `get_bool(config, path...)` - Parse boolean values (true/false, yes/no, 1/0)
- `get_float(config, path...)` - Parse floating-point numbers
- `get_list(config, path...)` - Extract arrays/lists

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

### Entry Processing

**Purpose**: Manipulate and combine CCL entries for advanced configuration scenarios

**Core Functions**:
- `filter(entries, predicate)` - Remove unwanted entries (e.g., comments)
- `compose(entries1, entries2)` - Merge multiple entry lists
- `expand_dotted(entries)` - Convert dotted keys to nested structure

**Example**:
```ccl
/= Development config
database.host = localhost
database.port = 5432

/= Production overrides  
database.host = prod.db.com
```

```pseudocode  
dev_entries = parse(dev_config)
prod_entries = parse(prod_config)
combined = compose(dev_entries, prod_entries)
final_config = build_hierarchy(combined)
```

### Extended Features (Implementation-Specific)

**Dotted Representation of Hierarchical Data (Experimental)**:
- Provides dotted access patterns for hierarchical config data
- `get_string(config, "database.host")` works for hierarchical `database = host = value`
- Both `get_string(config, "database.host")` and `get_string(config, "database", "host")` access the same nested data
- Currently available in Go implementation

**Configuration Formatting**:
- `pretty_print(config)` - Format config for human reading
- `round_trip_validate(text)` - Parse and format to verify correctness

## Implementation Compatibility

| Feature Category | OCaml Reference | Go Implementation | Gleam Implementation | Test Suite Coverage |
|------------------|-----------------|-------------------|---------------------|---------------------|
| **Core CCL** | ✅ Full | ✅ Full | ✅ Full | 452 tests |
| **Typed Access** | ❌ None | ✅ Full | ✅ Full | 107 assertions |
| **Entry Processing** | ❌ None | ✅ Partial | ✅ Full | 67 assertions |
| **Dotted Representation** | ❌ None | ✅ Experimental | ❌ None | 18 tests |
| **Error Handling** | ✅ Basic | ✅ Full | ✅ Full | 15 assertions |
| **Pretty Printing** | ❌ None | ✅ Available | ❌ None | Round-trip tests |

### Feature Details

#### Typed Access Support
| Function | OCaml | Go | Gleam | Notes |
|----------|-------|----|----- |-------|
| get_string | ❌ | ✅ | ✅ | String extraction with path navigation |
| get_int | ❌ | ✅ | ✅ | Integer parsing with overflow detection |  
| get_bool | ❌ | ✅ | ✅ | Boolean parsing (true/false, yes/no, 1/0) |
| get_float | ❌ | ✅ | ✅ | Floating-point number parsing |
| get_list | ❌ | ✅ | ✅ | Array/list extraction from empty-key entries |

#### Entry Processing Support
| Function | OCaml | Go | Gleam | Notes |
|----------|-------|----|----- |-------|
| filter | ❌ | ✅ | ✅ | Comment filtering, custom predicates |
| compose | ❌ | ✅ | ✅ | Entry list merging for config composition |
| expand_dotted | ❌ | 🧪 Experimental | ❌ | Provide dotted representation of hierarchical data |

#### Path Navigation Styles
| Style | Example | OCaml | Go | Gleam |
|-------|---------|-------|----|----- |
| Hierarchical | get_string(config, "db", "host") | ❌ | ✅ | ✅ |
| Dotted | get_string(config, "db.host") | ❌ | 🧪 Experimental | ❌ |
| Mixed | Both work identically | ❌ | 🧪 Experimental | ❌ |

## Implementation Guidance

Each API is fully tested in the [CCL Test Suite](https://github.com/ccl-test-data) with specific function coverage:

- **Type-Safe Access**: 107 assertions across 22 tests
- **Entry Processing**: 67 assertions across 19 tests  
- **Dotted Keys**: 18 tests (experimental feature)
- **Error Scenarios**: 15 assertions covering edge cases

When implementing these APIs:

1. **Start with Core CCL** - Ensure parse + build_hierarchy works correctly
2. **Add type-safe access** - Most common user expectation after core functionality
3. **Consider entry processing** - Useful for complex configuration scenarios  
4. **Experimental features** - Follow test specifications for consistency

## Language-Specific Documentation

For detailed implementation-specific usage:

- **OCaml**: See [chshersh/ccl](https://github.com/chshersh/ccl) for reference behavior
- **Go**: See [CCL implementations](https://github.com/chshersh/ccl) for full API and experimental features
- **Gleam**: See [CCL implementations](https://github.com/chshersh/ccl) for functional patterns

---

*Feature definitions and test coverage based on [CCL Test Suite](https://github.com/ccl-test-data) v2.1 with 452 tests across 167 test cases.*