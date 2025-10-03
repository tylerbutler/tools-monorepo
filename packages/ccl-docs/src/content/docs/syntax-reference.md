---
title: CCL Syntax Reference
description: Quick reference for CCL syntax patterns.
---

## Core Syntax

**Key-Value Pairs:**
```ccl
key = value
name = Alice
port = 8080
```

**Empty Values (Sections):**
```ccl
database =
  host = localhost
  port = 5432
```

**Empty Keys (Lists):**
```ccl
items =
  = first item
  = second item
```

**Comments:**
```ccl
/= This is a comment
```

**Multiline Values:**
```ccl
description = This is a long description
  that spans multiple lines
  and preserves indentation
```

## Quick Reference

| Syntax | Purpose | Example |
|--------|---------|---------|
| `key = value` | Assignment | `name = Alice` |
| `key =` | Section | `server =` |
| `= value` | List item | `= item` |
| `/= text` | Comment | `/= Note` |
| Indentation | Nesting | `  nested = value` |

## Edge Cases

**Equals in values:**
```ccl
formula = E = mc²
url = https://example.com?key=value
```

**Dots in keys (literal characters):**
```ccl
database.host = localhost
file.txt = content
```
⚠️ Dotted keys are **literal strings**, not nested structures. See [Dotted Keys Explained](/dotted-keys-explained).

**Unicode support:**
```ccl
greeting = Hello, 世界! 🌍
author = François Müller
```

**Whitespace handling:**
- Keys are trimmed: `  key  = value` → `"key"`
- Values preserve trailing spaces
- CRLF vs LF: CCL treats only LF as a newline, so CRs present are preserved as-is
