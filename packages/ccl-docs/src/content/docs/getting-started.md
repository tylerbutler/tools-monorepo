---
title: Getting Started with CCL
description: A comprehensive introduction to the Categorical Configuration Language - from basic syntax to practical examples.
---

# Getting Started with CCL

## What is CCL?

CCL (Categorical Configuration Language) is a **minimal configuration language** built on simple key-value pairs. Everything in CCL - nesting, lists, comments, typing - builds naturally from this foundation.

**Key design principles:**
- **Simplicity**: Everything starts with `key = value`
- **Composability**: Complex structures emerge from simple rules
- **Human-friendly**: Easy to read, write, and understand
- **Mathematical foundation**: Based on Category Theory for predictable behavior

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

## How CCL Works

Think of CCL like this processing pipeline:

```
┌─────────────────┐
│   Raw CCL Text  │
└─────────┬───────┘
          │ parse()
          ▼
┌─────────────────┐    ┌──────────────┐
│ Flat Key-Value  │───▶│ filter()     │
│    Entries      │    └──────┬───────┘
└─────────────────┘           │
                              ▼
                       ┌─────────────┐
                       │  Filtered   │
                       │   Entries   │
                       └──────┬──────┘
                              │ build_hierarchy()
                              ▼
                       ┌─────────────┐
                       │ Hierarchical│
                       │    Config   │
                       └─────────────┘
```

**Key insight**: Core CCL is the flat key-value entries in the middle. Everything else is optional processing you can choose to apply.

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
config_entries = filter(all_entries, key => !key.startsWith("/"))
config = build_hierarchy(config_entries)
```

## The Four Core Constructs

CCL has exactly **four fundamental constructs** that any parser must handle:

### 1. Basic Key-Value Pairs
```ccl
key = value
```
Creates: `Entry("key", "value")`

### 2. Empty Values (Sections)
```ccl
section =
```
Creates: `Entry("section", "")`
Used for: Creating nested objects

### 3. Empty Keys (Lists)
```ccl
= item
```
Creates: `Entry("", "item")`
Used for: Creating list items

### 4. Multiline Values
```ccl
description = First line
  Second line
  Third line
```
Creates: `Entry("description", "First line\nSecond line\nThird line")`

**That's the entire core language.** Comments, nesting, typing - everything else is additive.

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

## Next Steps

### For Configuration Users
- **[Syntax Reference](/syntax-reference)** - Quick lookup for CCL syntax patterns
- **[CCL FAQ](/ccl-faq)** - Common questions, edge cases, and gotchas
- **[Format Comparison](/format-comparison)** - How CCL compares to JSON, YAML, TOML

### For Parser Implementers
- **[Implementing CCL](/implementing-ccl)** - Complete guide to building CCL parsers
- **[API Reference](/api-reference)** - Recommended API patterns and conventions
- **[Test Architecture](/test-architecture)** - Using the test suite to validate your implementation

## About CCL

CCL was created by [@chshersh](https://github.com/chshersh) and is specified at
<https://chshersh.com/blog/2025-01-06-the-most-elegant-configuration-language.html>.

There is also a reference OCaml implementation at <https://github.com/chshersh/ccl>.

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
- **Comments**: Regular entries with `/` keys (use `filter()`)
- **Levels**: Choose your implementation level based on needs
- **Composable**: Each processing step is independent

That's all you need to get started with CCL! The power comes from the simple, composable design.