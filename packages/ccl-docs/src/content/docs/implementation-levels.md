---
title: CCL Implementation Levels
description: A comprehensive guide to the different levels of CCL implementation and what each provides.
---

# CCL Implementation Levels

CCL implementations can choose their level of support based on their specific needs. This guide breaks down the different levels and helps you decide which is right for your use case.

## Quick Decision Guide

**Not sure which level you need?** Use this matrix:

| Need | Level 1 | Level 2 | Level 3 | Level 4 |
|------|---------|---------|---------|---------|
| **Minimal footprint** | ✅ | ❌ | ❌ | ❌ |
| **Custom processing** | ✅ | ⚠️ | ⚠️ | ❌ |
| **Production configs** | ❌ | ✅ | ✅ | ✅ |
| **Comments** | Manual | ✅ | ✅ | ✅ |
| **Nesting** | Manual | ✅ | ✅ | ✅ |
| **Dotted keys** | ❌ | ❌ | ✅ | ✅ |
| **Config merging** | Manual | Manual | ✅ | ✅ |
| **Type safety** | ❌ | ❌ | ❌ | ✅ |
| **Schema validation** | ❌ | ❌ | ❌ | ✅ |

**Recommendation**: Start with **Level 2** for most applications - it provides everything needed for practical configuration with good balance of features vs complexity.

## Quick Reference Card

### When to Choose Each Level

| If you need... | Choose | Time to implement |
|----------------|--------|-------------------|
| Rapid prototyping, minimal footprint | **Level 1** | 1-2 days |
| Production configs with comments/nesting | **Level 2** | 3-5 days |
| Advanced features, config merging | **Level 3** | 1-2 weeks |
| Type safety, schema validation | **Level 4** | 2-4 weeks |

### Test Coverage by Level

- **Level 1**: 18 core tests
- **Level 2**: +8 tests (26 total)
- **Level 3**: +30 tests (56 total)  
- **Level 4**: +17+ tests (73+ total)

## Overview

| Level | What You Get | Use Case | Test Coverage |
|-------|--------------|----------|---------------|
| **Level 1** | Entry parsing | Rapid prototyping, simple configs | 18 tests |
| **Level 2** | Complete config language | Production configurations | +8 tests |
| **Level 3** | Common features | Advanced production systems | +30 tests |
| **Level 4** | Advanced features | Specialized applications | +17 tests |

## Level 1: Entry Parsing

**Goal**: Parse CCL text into flat key-value entries  
**Foundation**: Handle the 4 core constructs  
**Test Suite**: `tests/core/essential-parsing.json` (18 tests)

### What You Get

```pseudocode
entries = parse(text)
// Result: List<Entry> with all key-value pairs
```

**Core constructs handled**:
1. `key = value` - Basic key-value pairs
2. `key =` - Empty values (sections)  
3. `= value` - Empty keys (lists)
4. Multiline values via indentation

### When To Use Level 1

- **Rapid prototyping**: Get CCL parsing working quickly
- **Simple configurations**: Flat or mostly flat config files
- **Custom processing**: You want to handle object construction yourself
- **Embedded systems**: Minimal memory/code footprint needed

### Example Usage

```pseudocode
entries = parse(`
name = MyApp
/= This is a comment
database =
  host = localhost
`)

// You get raw entries:
// Entry("name", "MyApp")
// Entry("/", "This is a comment") 
// Entry("database", "")
// Entry("host", "localhost")

// Handle comments manually:
config_entries = entries.filter(e => !e.key.startsWith("/"))

// Process nesting yourself:
for entry in config_entries {
  // Your custom logic here
}
```

## Level 2: Complete Config Language

**Goal**: Everything needed for practical configuration  
**Foundation**: Level 1 + comment filtering + object construction  
**Test Suite**: `tests/core/object-construction.json` (+8 tests)

### What You Get

```pseudocode
entries = parse(text)                           // Level 1
config_entries = filter_keys(entries, ...)     // Filter unwanted keys  
objects = make_objects(config_entries)          // Build hierarchy
// Result: Nested configuration object
```

**Additional features**:
- **Key filtering**: General-purpose `filter_keys()` function
- **Object construction**: Convert flat entries to nested objects  
- **Comment handling**: Standard `/=` filtering pattern
- **List construction**: Empty keys become arrays

### When To Use Level 2

- **Production configurations**: Real applications with nesting and comments
- **Standard usage**: Covers 95% of configuration use cases
- **Team adoption**: Good balance of features vs complexity
- **Migration from other formats**: Provides expected config language features

### Example Usage

```pseudocode
// Standard Level 2 workflow
text = `
name = MyApp
/= Database configuration  
database =
  host = localhost
  port = 5432
features =
  = authentication
  = logging
`

entries = parse(text)                                    // Level 1
config = filter_keys(entries, k => !k.startsWith("/"))  // Remove comments
objects = make_objects(config)                           // Build structure

// Result: 
// {
//   name: "MyApp",
//   database: {host: "localhost", port: "5432"},
//   features: ["authentication", "logging"]
// }
```

## Level 3: Common Features

**Goal**: Features most implementations want  
**Foundation**: Level 2 + dotted keys + merging + edge cases  
**Test Suite**: `tests/core/comprehensive-parsing.json` (+30 tests)

### What You Get

```pseudocode
// Dotted key access
host1 = get(config, "database", "host")      // Hierarchical
host2 = get(config, "database.host")         // Dotted

// Configuration merging  
final = merge(base_config, env_overrides)

// Robust edge case handling
```

**Additional features**:
- **Dotted key support**: `database.host` ↔ hierarchical access  
- **Configuration merging**: Compose multiple configs
- **Advanced parsing**: Handle edge cases and malformed input
- **Error reporting**: Detailed error messages with context

### When To Use Level 3

- **Production systems**: Complex configurations with multiple sources
- **Library implementations**: Providing CCL as a dependency
- **Enterprise applications**: Need robust error handling
- **Configuration management**: Merging configs from multiple sources

### Example Usage

```pseudocode
// Multiple access patterns work
config = make_objects(entries)

// Both of these work:
port = get_string(config, "database", "port")     // Hierarchical  
port = get_string(config, "database.port")        // Dotted

// Merge configurations
base = parse_and_build(base_config_text)
overrides = parse_and_build(env_overrides_text)
final_config = merge(base, overrides)

// Robust error handling
result = get_string(config, "missing.key")
if result.is_error() {
  print("Key not found: missing.key at line 42")
}
```

## Level 4: Advanced Features

**Goal**: Nice-to-have, implementation-specific features  
**Foundation**: Level 3 + typed APIs + validation + extensions  
**Test Suite**: Various feature tests (+17+ tests)

### What You Get

```pseudocode
// Type-safe access with consistent error handling
port = get_int(config, "database", "port")    // Returns int or error
debug = get_bool(config, "debug")             // Handles "true"/"false"/"1"/"0"

// Schema validation
validate_schema(config, schema)               // Ensure structure/types

// Advanced features (implementation-specific)
```

**Additional features**:
- **Typed accessors**: `get_int()`, `get_bool()`, `get_float()`, etc.
- **Schema validation**: Validate structure and types
- **Include directives**: File inclusion mechanisms  
- **Variable interpolation**: Reference other values
- **Custom extensions**: Implementation-specific features

### When To Use Level 4

- **Specialized applications**: Need type safety or validation
- **Large configurations**: Schema validation prevents errors  
- **Developer experience**: Better IDE support and error messages
- **Library features**: Providing advanced CCL functionality

### Example Usage

```pseudocode
// Type-safe access
port = get_int(config, "database", "port")         // Result<int, Error>
timeout = get_duration(config, "timeout")          // Custom types
hosts = get_string_list(config, "allowed_hosts")   // Type-safe lists

// Schema validation
schema = {
  database: {
    host: string,
    port: int(1..65535),
    ssl: boolean
  }
}
validate_schema(config, schema)  // Throws/returns validation errors

// Advanced features (implementation-specific)
config_with_includes = resolve_includes(config)    // Process include directives
interpolated = resolve_variables(config)           // Handle ${var} references
```

## When to Choose Each Level

**Choose Level 1** if: You're prototyping, have specific processing needs, or need minimal footprint

**Choose Level 2** if: Building production applications (recommended for most users)

**Upgrade to Level 3** when: You need dotted key access, config merging, or building libraries  

**Consider Level 4** for: Type safety, schema validation, or specialized advanced features

## Implementation Strategy

### Progressive Implementation

Most implementations should follow this progression:

1. **Start with Level 1**: Get basic parsing working and tested
2. **Add Level 2**: Implement `filter_keys()` and `make_objects()`  
3. **Evaluate needs**: Do you need Level 3/4 features?
4. **Add features incrementally**: Implement only what you need

### Testing Strategy

```pseudocode
// Level 1
validate_tests("tests/core/essential-parsing.json")     // 18 tests

// Level 2  
validate_tests("tests/core/object-construction.json")   // +8 tests

// Level 3
validate_tests("tests/core/comprehensive-parsing.json") // +30 tests
validate_tests("tests/features/dotted-keys.json")       // +18 tests

// Level 4
validate_tests("tests/features/typed-access.json")      // +17 tests
// Additional feature tests as needed
```

### API Design

Design your API with levels in mind:

```pseudocode
// Level 1 API
entries = ccl.parse(text)

// Level 2 API  
entries = ccl.parse(text)
config = ccl.filter_keys(entries, predicate)
objects = ccl.make_objects(config)

// Level 3 API
config = ccl.parse_config(text)                    // parse + filter + build
merged = ccl.merge(config1, config2)
value = ccl.get(config, "dotted.key.path")

// Level 4 API
port = ccl.get_int(config, "database.port")
ccl.validate_schema(config, schema)
```

Each level builds naturally on the previous one, making it easy for users to adopt progressively.

This level-based approach ensures CCL implementations can start simple and grow in capability as needed, while maintaining consistency across different implementation complexity levels.