---
title: Dotted Keys Explained
description: Understanding the fundamental difference between dotted keys as literal strings vs hierarchical data representation, and how implementations bridge this gap.
---

# Dotted Keys Explained

A common source of confusion in CCL is the relationship between dotted keys and hierarchical data. This page clarifies the fundamental concepts and implementation approaches.

## The Core Distinction

In standard CCL, these two configurations are **completely different**:

### Dotted Keys (Literal String Keys)
```ccl
database.host = localhost
database.port = 5432
```
Creates entries with **literal string keys**:
- Entry("database.host", "localhost")  
- Entry("database.port", "5432")

### Hierarchical Data  
```ccl
database =
  host = localhost
  port = 5432
```
Creates **nested object structure**:
- Entry("database", "host = localhost\nport = 5432")
- After `build_hierarchy()`: `{database: {host: "localhost", port: "5432"}}`

## The Access Pattern Problem

This creates different access requirements:

### Accessing Dotted Keys
```pseudocode
// These keys exist as literal strings
host = get_string(config, "database.host")     // ✓ Works
port = get_string(config, "database.port")     // ✓ Works

// This fails - no nested "database" object exists  
host = get_string(config, "database", "host")  // ❌ Fails
```

### Accessing Hierarchical Data
```pseudocode  
// Navigate the object hierarchy
host = get_string(config, "database", "host")  // ✓ Works
port = get_string(config, "database", "port")  // ✓ Works

// This fails - no "database.host" string key exists
host = get_string(config, "database.host")     // ❌ Fails  
```

## The Implementation Challenge

This creates a user experience problem:
- Users expect `database.host = value` and hierarchical `database = host = value` to be equivalent
- But they require completely different access patterns
- Configuration authors must choose one style and stick with it
- Mixed styles don't work together

## Dotted Representation of Hierarchical Data

Some implementations solve this by providing **dotted representation of hierarchical data**:

```pseudocode
// Implementation provides both access patterns for hierarchical data
database =
  host = localhost
  port = 5432

// Both access patterns now work:
host1 = get_string(config, "database", "host")    // ✓ Hierarchical access
host2 = get_string(config, "database.host")       // ✓ Dotted representation
```

**This is what we call "dotted key expansion" - but it's really "dotted representation of hierarchical data".**

## Implementation Approaches

### Standard CCL Behavior
- Dotted keys are literal string keys: `"database.host"`
- Hierarchical data creates nested objects: `{database: {host: "..."}}`
- Access patterns are mutually exclusive
- **Status**: Universal across all implementations

### Dotted Representation (Experimental)
- Hierarchical data gets both hierarchical and dotted access patterns
- `get(config, "database", "host")` and `get(config, "database.host")` both work
- Dotted keys may be converted to hierarchical structure
- **Status**: Experimental, implementation-specific

### Implementation Matrix

| Behavior | OCaml Reference | Go Implementation | Gleam Implementation |
|----------|-----------------|-------------------|---------------------|
| Literal dotted keys | ✅ Standard | ✅ Standard | ✅ Standard |
| Hierarchical access | ✅ Standard | ✅ Standard | ✅ Standard |
| Dotted representation | ❌ None | 🧪 Experimental | ❌ None |

## Best Practices

### For Configuration Authors

**Choose One Style Consistently:**
```ccl
# Option 1: Pure hierarchical (recommended)
database =
  host = localhost
  port = 5432
api =
  endpoint = https://api.example.com
  timeout = 30

# Option 2: Pure dotted keys  
database.host = localhost
database.port = 5432
api.endpoint = https://api.example.com
api.timeout = 30

# ❌ Don't mix styles
database =
  host = localhost
database.port = 5432  # This creates a separate "database.port" string key!
```

### For Implementation Authors

**Document Access Patterns Clearly:**
- Specify whether you support dotted representation of hierarchical data
- Provide examples of both access patterns if supported
- Warn users about mixing dotted keys and hierarchical data

**Consider User Expectations:**
- Many users expect dotted and hierarchical syntax to be equivalent
- Consider implementing dotted representation if it fits your use case
- Document any implementation-specific behavior clearly

## Common Misconceptions

### ❌ "Dotted keys are just syntax sugar for hierarchical data"
**Reality**: In standard CCL, they create completely different data structures.

### ❌ "I can mix dotted and hierarchical syntax freely"  
**Reality**: Mixed syntax creates separate keys/objects that don't interact.

### ❌ "All CCL implementations handle dotted keys the same way"
**Reality**: Dotted representation is experimental and implementation-specific.

## Terminology Clarification

| Term | Meaning | Example |
|------|---------|---------|
| **Dotted Key** | Literal string key containing dots | `"database.host"` |
| **Hierarchical Data** | Nested object structure | `{database: {host: "..."}}` |
| **Dotted Representation** | Dotted access to hierarchical data | `get(obj, "database.host")` for hierarchical data |
| **Dotted Key Expansion** | Converting dotted keys to hierarchy | `"database.host"` → `{database: {host: "..."}}` |

## Related Documentation

- **[Syntax Reference](syntax-reference.md#dotted-keys-experimental-feature)** - Current experimental status
- **[Higher-Level APIs](higher-level-apis.md)** - Implementation compatibility matrix  
- **[Core Concepts](core-concepts.md)** - Understanding CCL's data model
- **[Implementation Levels](implementation-levels.md)** - When to add dotted representation support

---

*This explanation reflects the current state of CCL implementations. The dotted representation behavior may be standardized in future CCL versions based on implementation experience and user feedback.*