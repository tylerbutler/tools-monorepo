---
title: Parsing Algorithm
description: Language-agnostic algorithm for parsing CCL configuration files.
---

# CCL Parsing Algorithm

CCL is parsed through recursive descent to a fixed point. The algorithm is simple:

1. Parse text into key-value entries
2. Build nested objects from indented entries
3. Recursively parse values that contain more CCL
4. Stop when no more CCL syntax remains (fixed point)

## Core Algorithm

### Input Format

CCL is line-based text with key-value pairs:

```ccl
key = value
another = value with spaces
nested =
  child = nested value
  sibling = another nested
```

### Parse Entries

Parse entries splits lines on `=` while grouping indented lines into the current entry's value.

**For each line**:

1. **Lines at base indentation with `=`** → Start a new entry
   - Split on first `=` character
   - Trim whitespace from key
   - Remove leading spaces from value (preserve trailing)

2. **Lines indented MORE than current entry** → Continuation
   - Append to current entry's value (preserving the full line including indentation)
   - Prefixed with `\n`

3. **Lines without `=`** → Also continuation (if indented) or skip

**Examples**:

```
"key = value"  →  Entry {key: "key", value: "value"}
"a = b = c"    →  Entry {key: "a", value: "b = c"}
```

**Indentation grouping**:

```ccl
parent =
  child = nested
  sibling = another
```

Becomes a single entry:
```
Entry {key: "parent", value: "\n  child = nested\n  sibling = another"}
```

The indented lines become part of `parent`'s value because they are indented MORE than `parent`. The value still contains CCL syntax (`=`), which Build Hierarchy will recursively parse.

**Key rules**:
- Base indentation is determined by the first non-empty line
- Lines with `indent <= base` and containing `=` start new entries
- Lines with `indent > currentKeyIndent` are continuations
- Both tabs and spaces count as indentation characters
- Tabs are treated as a single space for indentation counting

**Whitespace handling**:
- Keys: fully trimmed
- Values: leading spaces removed, trailing preserved

**Special keys**:
- Empty key `= value` → list item
- Comment entry `/ = text` → key is `/`, value is `text`

### Build Hierarchy

Build hierarchy takes the flat entries from Parse Entries and recursively parses values that contain CCL syntax.

**Algorithm**:
1. For each entry, check if the value contains `=`
2. If yes → recursively parse the value as CCL (back to Parse Entries)
3. If no → the value is a terminal string (fixed point reached)
4. Build the final nested object structure

**Example**:
```
value: "\n  child = nested\n  sibling = another"
→ Contains '=' → Parse recursively
→ Results in: {child: "nested", sibling: "another"}
```

**Fixed-point termination**:
- Recursion stops when values no longer contain `=`
- Prevents infinite recursion: plain strings have no structure to parse

### Complete Example

Input:
```ccl
database =
  host = localhost
  port = 5432

users =
  = alice
  = bob
```

**Parse entries:**
```
Entry {key: "database", value: "\n  host = localhost\n  port = 5432"}
Entry {key: "users", value: "\n  = alice\n  = bob"}
```

**Build hierarchy (recursive parsing):**
```
database.value contains '=' → parse recursively:
  Entry {key: "host", value: "localhost"}
  Entry {key: "port", value: "5432"}

users.value contains '=' → parse recursively:
  Entry {key: "", value: "alice"}
  Entry {key: "", value: "bob"}
```

**Build objects:**
```json
{
  "database": {
    "host": "localhost",
    "port": "5432"
  },
  "users": ["alice", "bob"]
}
```

Fixed point reached: "localhost", "5432", "alice", "bob" contain no '=' → stop.

## Implementation Pattern

Pseudocode for recursive parser:

```python
def parse_ccl(text):
    entries = parse_entries(text)  # split on '='
    hierarchy = build_hierarchy(entries)  # group by indentation
    return recursively_parse(hierarchy)  # fixed point

def recursively_parse(entries):
    result = {}
    for entry in entries:
        value = entry.value

        if contains_ccl_syntax(value):  # Has '=' character
            # Recursively parse the value
            parsed = parse_ccl(value)
            result[entry.key] = parsed
        else:
            # Fixed point: plain string
            result[entry.key] = value

    return result
```

## Error Handling Essentials

**Malformed input**:
- Line with no '=' → skip or error (implementation choice)
- Inconsistent indentation → use explicit indentation counting
- Empty lines → ignore

**Edge cases**:
- Keys with '=' in them → impossible, first '=' is split point
- Values with '=' → fine, parse recursively
- Unicode in keys/values → valid, CCL is UTF-8
- CRLF vs LF → CCL treats only LF as a newline, so CRs present are preserved as-is

## Why This Is Core CCL

From the blog post:

> "The simplest possible config language is just key-value pairs. That's it."

The recursive fixed-point algorithm is _how_ those key-value pairs create nested structure. The OCaml type definition makes this explicit:

```ocaml
type t = Fix of t Map.Make(String).t
```

This says: "A CCL value is a fixed point of a map from strings to CCL values."

The recursion _is_ the structure. The fixed point _is_ the termination.

## What's NOT in This Algorithm

These are library conveniences, not core CCL:

- **Type conversion**: "5432" → integer (user's job)
- **Validation**: checking required keys (user's job)
- **Dotted key expansion**: `foo.bar` → nested object (optional)
- **Pretty printing**: formatting output (implementation detail)

Core CCL is: parse key-value pairs recursively until fixed point.

## Implementation Notes

Different languages can adapt this algorithm:

**Functional approach**: Use recursive descent with pattern matching
**OOP approach**: Entry/Parser classes with builder pattern
**Dynamic approach**: Dictionaries/hashmaps with recursive loops

The algorithm is the same; the implementation style varies by language.
