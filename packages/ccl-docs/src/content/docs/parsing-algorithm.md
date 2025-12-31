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

CCL consists of key-value pairs separated by `=`:

```ccl
key = value
another = value with spaces
nested =
  child = nested value
  sibling = another nested
```

### Parse Entries

Find the first `=` character and split:

```
"key = value"  →  Entry {key: "key", value: "value"}
"a = b = c"    →  Entry {key: "a", value: "b = c"}
```

**Key whitespace rules**:
- Trim all whitespace from keys (including newlines): `"  key  "` → `"key"`
- Keys can span multiple lines if `=` appears on a subsequent line

**Value whitespace rules**:
- Trim leading whitespace on first line: `key =   value` → `"value"`
- Trim trailing whitespace on final line
- Preserve internal structure (newlines + indentation for continuation lines)

**Indentation tracking**:
1. Record the entry's indentation level (whitespace count before the key)
2. For each subsequent line, compare its indentation to the entry's level:
   - Greater indentation → continuation line (part of value)
   - Same or less indentation → new entry
3. Which characters count as whitespace depends on parser behavior:
   - `tabs_as_whitespace`: spaces and tabs are whitespace
   - `tabs_as_content`: only spaces are whitespace; tabs are content

**Special keys**:
- Empty key `= value` → list item
- Comment entry `/ = text` → key is `/`, value is `text`

### Build Hierarchy

Indentation determines structure. Example:

```ccl
parent =
  child = nested
  sibling = another
```

The parser records `parent`'s indentation level (0). Lines `child` and `sibling` have greater indentation (2), so they become part of `parent`'s value:

```
Entry {key: "parent", value: "child = nested\nsibling = another"}
```

### Recursive Parsing (Fixed Point)

Parse values that contain CCL syntax:

```
value: "child = nested\nsibling = another"
→ Contains '=' → Parse recursively
→ Results in: {child: "nested", sibling: "another"}
```

**Fixed-point termination**:
- Parse value as CCL
- If parsing yields structure → recurse on nested values
- If value has no '=' → stop (fixed point reached)
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
Entry {key: "database", value: "host = localhost\nport = 5432"}
Entry {key: "users", value: "= alice\n= bob"}
```

**Recursive parsing:**
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
