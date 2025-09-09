---
title: Core CCL Concepts
description: Understanding the fundamental concepts that make CCL work - from parse results to implementation levels.
---

# Core CCL Concepts

CCL is built on simple, composable concepts. Understanding these core ideas will help you work with CCL effectively, whether you're writing configuration files or implementing a CCL parser.

## Mental Model: How CCL Works

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
          │                   ▼
          │            ┌─────────────┐
          │            │  Filtered   │
          │            │   Entries   │
          │            └──────┬──────┘
          │                   │ build_hierarchy()
          │                   ▼
          │            ┌─────────────┐
          │            │ Hierarchical│
          │            │    Config   │
          │            └──────┬──────┘
          │                   │ get_typed()
          │                   ▼
          │            ┌─────────────┐
          │            │ Application │
          │            │    Values   │
          │            └─────────────┘
          │
          ▼ (alternative: work with raw entries)
┌─────────────────┐
│ Direct Entry    │
│ Processing      │
└─────────────────┘
```

**Key insight**: Core CCL = The entry list in the middle. Everything else is optional processing you can choose to apply.

## Quick Reference

### The Processing Pipeline

1. **Raw Text** → `parse()` → **Flat Entries** *(Level 1)*
2. **Flat Entries** → `filter()` → **Filtered Entries** *(Level 2)*  
3. **Filtered Entries** → `build_hierarchy()` → **Nested Config** *(Level 3)*
4. **Nested Config** → `get_typed()` → **Application Values** *(Level 4)*

### Key Principles

- **Everything is entries**: CCL builds from simple key-value pairs
- **Comments are entries**: Use `/=` keys, filter with `filter()`  
- **Processing is optional**: Choose your level based on needs
- **Each step is testable**: Debug and validate at any stage

## What is Core CCL?

**Core CCL is what you get when you call `parse()`** - a list of key-value entries. Everything else in CCL is built on top of this foundation.

```ccl
name = MyApplication
/= This is a comment
database =
  host = localhost
  port = 5432
ports =
  = 8080
  = 8081
```

When parsed, this becomes **4 simple entries**:
```
Entry("name", "MyApplication")
Entry("/", "This is a comment") 
Entry("database", "")
Entry("host", "localhost")
Entry("port", "5432")
Entry("ports", "")
Entry("", "8080")
Entry("", "8081")
```

That's it. Everything else - nested objects, comments, lists, typed access - is built on top of these key-value entries.

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

## Implementation Levels

CCL implementations can choose their level of support based on needs:

### Level 1: Entry Parsing
**Goal**: Parse text into flat key-value entries  
**What you get**: The 4 core constructs above  
**Use case**: Rapid prototyping, simple configurations

```pseudocode
entries = parse(text)
// Result: List<Entry> with all key-value pairs
```

### Level 2: Complete Config Language  
**Goal**: Everything needed for practical configuration  
**What you get**: Level 1 + comment filtering + object construction

```pseudocode
entries = parse(text)                           // Level 1
config_entries = filter(entries, ...)          // Filter unwanted keys  
objects = build_hierarchy(config_entries)       // Build hierarchy
// Result: Nested configuration object
```

### Level 3: Common Features
**Goal**: Features most implementations want  
**What you get**: Level 2 + dotted keys + merging

```pseudocode
// Dotted key access: "database.host" and nested access both work
host1 = get(config, "database", "host")      // Hierarchical
host2 = get(config, "database.host")         // Dotted

// Configuration merging
final = merge(base_config, env_overrides)
```

### Level 4: Advanced Features
**Goal**: Nice-to-have, implementation-specific features  
**What you get**: Level 3 + typed APIs + validation + more

```pseudocode
port = get_int(config, "database", "port")    // Type-safe access
debug = get_bool(config, "debug")             // Boolean parsing
validate_schema(config, schema)               // Schema validation
```

## Why This Design Matters

### Comments Are Just Entries
Comments aren't special syntax - they're regular entries with keys starting with `/`. This means any Level 1 parser supports comments automatically, and you can use flexible comment conventions.

### Everything Is Composable  
Because everything builds on the same entry foundation, each processing step is independent and testable:

```pseudocode
entries = parse(text) → filter() → build_hierarchy() → config
```

### Practical Benefits
- **Debugging**: Easy to inspect raw entries when issues occur
- **Flexibility**: Choose your processing level based on needs  
- **Simplicity**: Minimal APIs with maximum capability
- **Testing**: Each step can be tested independently

## Summary

The power of CCL comes from this simple, composable design - everything builds naturally from basic key-value entries. Whether you need simple parsing or advanced features, you can choose the processing level that fits your needs while maintaining the same simple foundation.

## Related Documentation

- **[Getting Started](/getting-started)** - Basic CCL syntax and practical examples
- **[Implementation Levels](/implementation-levels)** - Detailed guide to choosing your processing level
- **[CCL FAQ](/ccl-faq)** - Common questions about CCL concepts and behavior
- **[Implementing CCL](/implementing-ccl)** - How to build these concepts into a parser