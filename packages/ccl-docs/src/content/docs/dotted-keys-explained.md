---
title: Dotted Keys Explained
description: Understanding dotted keys as literal strings vs hierarchical nesting in CCL.
---

In CCL, dotted keys are **literal string keys** containing dots, not shorthand for nested structures.

## The Core Distinction

These create **different data structures**:

```ccl
# Dotted key (literal string)
database.host = localhost
→ Entry("database.host", "localhost")

# Hierarchical nesting
database =
  host = localhost
→ Entry("database", "host = localhost")
→ After build_hierarchy(): {database: {host: "localhost"}}
```

## Access Patterns

**Dotted keys** use the literal string:
```pseudocode
get_string(config, "database.host")      // ✓ Works
get_string(config, "database", "host")   // ❌ No nested object
```

**Hierarchical data** uses nested access:
```pseudocode
get_string(config, "database", "host")   // ✓ Works
get_string(config, "database.host")      // ❌ No literal key
```

## Best Practice: Choose One Style

```ccl
# ✓ Hierarchical (recommended)
database =
  host = localhost
  port = 5432

# ✓ Dotted keys
database.host = localhost
database.port = 5432

# ❌ Don't mix - creates separate keys
database =
  host = localhost
database.port = 5432  # Different key!
```

## Implementation Note

Some implementations provide **dotted representation** - allowing dotted access to hierarchical data. This is **experimental and optional**. Check your implementation's documentation.
