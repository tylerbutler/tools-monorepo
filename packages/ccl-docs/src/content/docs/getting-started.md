---
title: Getting Started
description: A gentle introduction to the Categorical Configuration Language.
---

# Getting Started with CCL

## What is CCL?

CCL is a minimal configuration format that uses simple key-value pairs with indentation-based nesting:

```ccl
database =
  host = localhost
  port = 5432
server =
  ports =
    = 8000
    = 8001
```

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

### Parsing CCL

CCL follows a simple parsing model that any language can implement:

1. **Parse text** → entries (key-value pairs)
2. **Build objects** → nested structure
3. **Access values** → typed or string values

Different CCL implementations provide language-specific APIs, but all follow this same pattern.

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

Use comment keys starting with `/` for documentation:

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

## Real-World Example

Here's a complete web server configuration:

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

## Core Concepts

### Implementation Architecture

CCL implementations follow a feature-based architecture:

1. **Essential Parsing** - Parse text into key-value entries
2. **Object Construction** - Build nested objects from flat entries  
3. **Optional Features** - Choose dotted keys, comments, typed access, etc.

### Key Features

- **Simple Syntax**: Just key-value pairs with `=`
- **Nested Structure**: Use indentation for hierarchy
- **List Support**: Empty keys create arrays
- **Comments**: Keys starting with `/` for documentation
- **No Quotes Required**: All values are strings by default
- **Flexible**: Supports both flat and hierarchical approaches

## Next Steps

Now that you understand the basics:

1. **Try the examples** - Practice with the syntax patterns above
2. **Read the [CCL FAQ](ccl_faq.md)** - Common questions and gotchas
3. **See [Migration Guide](migration-guide.md)** - Convert from JSON/YAML
4. **Check language-specific implementations** - Find CCL libraries for your language

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
- Everything is a string (types handled by applications)
- Indentation creates nesting
- Empty keys (`=`) create list items
- Comment keys (`/=`) provide documentation
- Duplicate keys merge or accumulate depending on context

That's all you need to get started with CCL! The syntax is simple, but the power comes from how you structure and access your configuration data.