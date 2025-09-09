---
title: Getting Started with CCL
description: An introduction to the Categorical Configuration Language.
---

## What is CCL?

CCL is a minimal configuration format built on a simple foundation: **key-value entries**. Everything in CCL - nesting, lists, comments, typing - builds on top of these basic entries.

### Quick Start Example

Here's a complete web server configuration to get you started:

```ccl
app =
  name = MyWebApp
  version = 1.0.0

server =
  host = 0.0.0.0
  port = 8080
  
database =
  host = localhost
  port = 5432
  name = myapp_db

allowed_origins =
  = https://example.com
  = https://www.example.com
```

**Key features you'll notice:**
- **Simple syntax**: Just `key = value` pairs
- **Nesting**: Use indentation to group related settings
- **Lists**: Use `= value` for list items
- **Clean structure**: Easy to read and write

## Basic Syntax

### Simple Key-Value Pairs

Start with the most basic CCL configuration:

```ccl
app_name = MyApplication
version = 1.2.3
debug = true
port = 8080
```

**Key Points:**
- Use `key = value` syntax
- Keys can contain letters, numbers, dots, and underscores
- Values are strings (applications interpret them as needed)
- Whitespace around `=` is optional

## Nested Configuration

### Using Nested Sections

Group related configuration using indentation:

```ccl
database =
  host = localhost
  port = 5432
  username = admin

server =
  port = 8080
  debug = true
```

### Alternative: Flat Structure with Dot Notation

You can also use literal dot keys (where dots are part of the key name):

```ccl
database.host = localhost
database.port = 5432
server.port = 8080
server.debug = true
```

**Key Differences:**
- **Nested sections**: Create actual hierarchical structure
- **Literal dot keys**: Keys are literal strings like `"database.host"`
- **Result**: Both approaches produce accessible nested structure

**When to use each:**
- **Nested sections**: Better readability for complex configurations
- **Literal dot keys**: Direct parsing, better for flat or simple configurations

## Lists

### Simple Lists

Create lists using empty keys with indented values:

```ccl
allowed_hosts =
  = localhost
  = example.com
  = api.example.com

ports =
  = 8080
  = 8001
  = 8002
```

Lists in CCL use empty keys (`=`) to represent array items. Each `= value` becomes an item in the list.

## Comments and Documentation

CCL comments are just regular entries with special keys. The standard marker is `/=`:

```ccl
/= Database Configuration
/= Connection details for the primary database
database =
  host = localhost
  port = 5432
  
/= Server Configuration  
server =
  port = 8080
  /= Enable debug mode for development
  debug = true
```

**Key insight**: Comments are regular key-value entries, not special syntax. Any Level 1 parser handles them automatically. To use them as documentation:

```pseudocode
// Standard pattern - filter keys starting with "/"
config_entries = filter_keys(all_entries, key => !key.startsWith("/"))
config = make_objects(config_entries)
```

## Understanding CCL Implementation Levels

CCL implementations can choose their level of support based on needs:

**Level 1: Entry Parsing** - Parse text into flat key-value entries  
**Level 2: Complete Config Language** - Level 1 + comment filtering + object construction  
**Level 3: Common Features** - Level 2 + dotted keys + merging  
**Level 4: Advanced Features** - Level 3 + typed APIs + validation + more

> **For most users**: Level 2 provides everything needed for practical configuration. See [Implementation Levels](implementation-levels.md) for detailed comparison and choosing guidance.

## Common Patterns

### Environment-Specific Config

Structure configuration by environment:

```ccl
development =
  database =
    host = localhost
    port = 5432
  debug = true

production =
  database =
    host = db.example.com
    port = 5432
  debug = false
```

### Optional Configuration with Defaults

CCL implementations typically handle missing values gracefully:

```ccl
# Required settings
database.host = localhost

# Optional settings with defaults handled by application
# database.timeout = 30
# database.pool_size = 10
```

### Multiline Values

CCL supports multiline values using indentation:

```ccl
description = This is a multiline
  description that spans
  multiple lines with preserved
  indentation
```

## About CCL

CCL was created by [@chshersh](https://github.com/chshersh) and is specified at
<https://chshersh.com/blog/2025-01-06-the-most-elegant-configuration-language.html>.

There is also a reference OCaml implementation at <https://github.com/chshersh/ccl>.

## Next Steps

### For Configuration Users
1. **Try the examples** - Practice with the syntax patterns above
2. **Read the [CCL FAQ](ccl-faq.md)** - Common questions and best practices  
3. **Explore [Core Concepts](core-concepts.md)** - Understand how CCL works

### For Developers & Implementers
1. **Start with [Implementation Levels](implementation-levels.md)** - Choose your approach
2. **Follow [Implementing CCL](implementing-ccl.md)** - Build your own parser
3. **Check [API Reference](api-reference.md)** - Complete specification details

## Quick Reference

### Basic Syntax
```ccl
# Simple key-value
key = value

# Nested structure
section =
  nested_key = nested_value

# Lists
items =
  = first_item
  = second_item

# Comments  
/= This is a comment
```

### Core Principles
- **Foundation**: Everything builds from key-value entries  
- **Parsing**: 4 core constructs handle all syntax
- **Comments**: Regular entries with `/` keys (use `filter_keys()`)
- **Levels**: Choose your implementation level based on needs
- **Composable**: Each processing step is independent

That's all you need to get started with CCL! The power comes from the simple, composable design.