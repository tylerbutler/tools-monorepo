---
title: Syntax Reference
description: Quick reference guide for CCL syntax and patterns.
---

# CCL Syntax Reference

## Basic Syntax

### Key-Value Pairs
```ccl
key = value
name = Alice
port = 8080
```

### Empty Values (Sections)
```ccl
database =
  host = localhost
  port = 5432
```

### Empty Keys (Lists)
```ccl
items =
  = first item
  = second item
  = third item
```

### Comments
```ccl
/= This is a comment
#= Alternative comment style
//= Another comment style
```

### Multiline Values
```ccl
description = This is a long description
  that spans multiple lines
  and preserves indentation
```

### Multiline Keys
```ccl
very long key name
= value
```

## Advanced Patterns

### Nested Structures
```ccl
app =
  server =
    host = 0.0.0.0
    port = 8080
  database =
    url = postgres://localhost
```

### Dotted Keys 
```ccl
database.host = localhost
database.port = 5432
```

**Important**: In standard CCL, dotted keys are **literal string keys** - `database.host` is just a string containing dots, not nested data.

**Accessing Dotted Keys:**
```pseudocode
host = get_string(config, "database.host")  // ✓ Literal string key
host = get_string(config, "database", "host")  // ❌ No nested structure
```

**This is different from hierarchical data:**
```ccl
database =
  host = localhost
  port = 5432
```

**⚠️ Experimental Feature**: Some implementations provide "dotted representation of hierarchical data" where both access patterns work for hierarchical structures. This is implementation-specific and experimental.

**For a complete explanation of this distinction, see [Dotted Keys Explained](dotted-keys-explained.md).**

### Mixed Lists and Objects
```ccl
servers =
  primary =
    host = server1.example.com
    port = 8080
  replicas =
    = server2.example.com:8080
    = server3.example.com:8080
```

### Indexed Lists
```ccl
priorities =
  0 = critical
  1 = high
  2 = medium
  3 = low
```

## Special Characters

### Equals in Values
```ccl
formula = E = mc²
url = https://example.com?key=value&other=data
```

### Dots in Keys
```ccl
file.txt = content
version.1.0 = stable
```

### Unicode Support
```ccl
greeting = Hello, 世界! 🌍
author = François Müller
```

## Whitespace Rules

### Key Trimming
```ccl
  key with spaces   = value
# Parsed as: "key with spaces" = "value"
```

### Value Preservation
```ccl
key = value with trailing spaces  
# Trailing spaces are preserved
```

### Indentation
```ccl
# Spaces determine nesting level
parent =
  child = value
    grandchild = deeper value  # ERROR: Invalid nesting
```

## Common Patterns

### Configuration Sections
```ccl
development =
  debug = true
  log_level = verbose

production =
  debug = false
  log_level = error
```

### Feature Flags
```ccl
features =
  = authentication
  = caching
  = analytics
```

### Environment Variables
```ccl
env =
  DATABASE_URL = postgres://localhost/myapp
  REDIS_URL = redis://localhost:6379
  SECRET_KEY = change-me-in-production
```

### API Endpoints
```ccl
endpoints =
  users = /api/v1/users
  posts = /api/v1/posts
  auth =
    login = /api/v1/auth/login
    logout = /api/v1/auth/logout
```

## Edge Cases

### Empty File
```ccl
# Empty file is an error
```

### Whitespace-Only Lines
```ccl
key = value

# Blank line above is preserved in multiline context
```

### No Equals Sign
```ccl
this line has no equals
# Behavior is implementation-specific
```

### Multiple Equals Signs
```ccl
key = value = with = many = equals
# Everything after first = is the value
```

## Quick Reference Table

| Syntax | Purpose | Example |
|--------|---------|---------|
| `key = value` | Basic assignment | `name = Alice` |
| `key =` | Section header | `server =` |
| `= value` | List item | `= item` |
| `/= text` | Comment | `/= Note` |
| Indentation | Nesting/continuation | `  nested = value` |
| `.` in key | Literal dot character | `file.txt = data` |

## Best Practices

1. **Use consistent indentation** - Either spaces or tabs, not mixed
2. **Group related settings** - Use sections for organization
3. **Comment complex values** - Explain non-obvious configurations
4. **Keep keys simple** - Avoid special characters when possible
5. **Use meaningful names** - Clear, descriptive key names

## Anti-Patterns

1. **Don't mix indentation styles** - Pick spaces or tabs
2. **Don't rely on trailing whitespace** - It's preserved but invisible
3. **Don't nest too deeply** - Keep hierarchy reasonable
4. **Don't use dots for nesting** - Use indentation for true nesting
5. **Don't put secrets in config** - Use environment variables