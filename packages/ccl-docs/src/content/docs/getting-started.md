---
title: CCL Syntax
description: Core CCL syntax rules with edge cases
---

CCL uses **key-value pairs** with indentation for nesting. **That's the entire format.** All keys and values are
`string`s. Because everything is a `string`, you don't need to worry about escaping "special" characters, surrounding
"real strings" in quotes, etc. You'll get a string value matching exactly what you wrote in the config.

## Core Syntax Rules

### 1. Key-Value Pairs

```ccl
key = value
another = some text value
```

- Split on first `=`
- **Key** is trimmed of leading and trailing whitespace
- **Value** is trimmed of both leading and trailing whitespace

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

Comments use `/=` syntax. Only at line start.

:::tip
This comment format is a convention, and is changeable. Comments are entries with `/` as the key - your application can filter or interpret them differently if needed.
:::

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

**CRLF vs LF**: CCL treats only LF (`\n`) as a newline; CR characters are preserved as content by default. Implementations may optionally normalize CRLF to LF with the `crlf_normalize_to_lf` behavior.

**Whitespace-only values**: Preserved if present after `=`.

```ccl
key =
# Value is "    " (4 spaces)
```
