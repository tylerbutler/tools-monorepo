---
title: CCL Syntax
description: Core CCL syntax rules with edge cases
---

CCL uses **key-value pairs** with indentation for nesting. That's the entire format. All keys and values are `string`s.

## Core Syntax Rules

### 1. Key-Value Pairs

```ccl
key = value
another = some text value
```

- Split on first `=`
- Key is trimmed of whitespace
- Value preserves whitespace (except leading)

### 2. Empty Keys (Lists)

```ccl
servers =
  = web1.example.com
  = web2.example.com
  = api.example.com
```

Empty key (`= value`) creates list items.

### 3. Comments

```ccl
/= This is a comment
key = value  /= Not a comment, value is "value  /= Not a comment"
```

Comments use `/=` key syntax. Only at line start.

### 4. Indentation for Nesting

```ccl
parent =
  child = nested value
  another = also nested
```

Lines indented more than previous = part of that value.

### 5. Recursive Parsing

```ccl
beta =
  mode = sandbox
  capacity = 2
```

The value `mode = sandbox\ncapacity = 2` is **recursively parsed as CCL**.

## Edge Cases

**Malformed Input**: Missing `=` treats entire line as key with empty value.

**Unicode**: UTF-8 supported. Keys and values can contain any Unicode characters.

**CRLF vs LF**: Line endings normalized to LF (`\n`) before parsing.

**Whitespace-only values**: Preserved if present after `=`.

```ccl
key =
# Value is "    " (4 spaces)
```
