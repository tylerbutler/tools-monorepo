---
title: FAQ
description: Frequently asked questions about CCL (Categorical Configuration Language).
---

## Table of Contents

- [Language Basics](#language-basics)
- [Dot Notation and Keys](#dot-notation-and-keys)
- [Nesting and Structure](#nesting-and-structure)
- [Indentation and Whitespace](#indentation-and-whitespace)
- [Values and Types](#values-and-types)
- [Comments](#comments)
- [Lists and Arrays](#lists-and-arrays)
- [Comparison with Other Formats](#comparison-with-other-formats)
- [Implementation Details](#implementation-details)
- [Common Gotchas](#common-gotchas)

---

## Language Basics

### Q: What is CCL?
**A:** CCL (Categorical Configuration Language) is a minimalist configuration language based on simple key-value pairs. It's designed around mathematical principles from Category Theory, providing elegant composition and recursive structure capabilities.

### Q: What does a basic CCL file look like?
**A:** 
```ccl
name = My Application
version = 1.0.0
debug = true

/= This is a comment
description = A sample application
  with multiline description
```

### Q: How is CCL different from JSON/YAML/TOML?
**A:** CCL is uniquely minimal - everything is just key-value pairs with strings. Complex structures emerge through composition and recursion rather than built-in syntax for objects, arrays, or types.

---

## Dot Notation and Keys

### Q: Does CCL support dot notation like `database.host = localhost`?
**A:** **Yes, but not the way you might think.** CCL treats `database.host` as a **literal string key** - dots are just characters in the key name, not navigation to nested structure.

**Example:**
```ccl
database.host = localhost
database.port = 5432
user.name = alice
```

**Result:** Three separate string keys:
- `"database.host"` → `"localhost"`
- `"database.port"` → `"5432"`
- `"user.name"` → `"alice"`

**CCL has zero special handling for dots in keys.**

### Q: So how do I create nested structure?
**A:** Use indentation, not dots:

```ccl
database =
  host = localhost
  port = 5432
user =
  name = alice
```

This creates actual nested CCL objects that can be navigated hierarchically.

### Q: Can I mix dot notation and nested structure?
**A:** Yes, they're completely orthogonal:

```ccl
# Flat keys with dots
database.backup.enabled = true

# Nested structure  
database =
  host = localhost
  port = 5432

# Both exist as separate entries
```

### Q: Why doesn't CCL parse dots automatically?
**A:** CCL's design philosophy is **maximum simplicity**. Keys are just strings - no special characters, no reserved syntax. The language doesn't impose any interpretation on your key names.

---

## Nesting and Structure

### Q: How does nesting actually work in CCL?
**A:** Nesting happens through **indented continuation lines**:

```ccl
section =
  key1 = value1
  key2 = value2
```

The parser sees:
1. Key `"section"` with value `"\n  key1 = value1\n  key2 = value2"`
2. The `make_objects()` function recursively parses that string as more CCL

### Q: Can I nest arbitrarily deep?
**A:** Yes! CCL uses a mathematical "fixed point" algorithm:

```ccl
server =
  database =
    primary =
      host = localhost
      port = 5432
    backup =
      host = backup.example.com
      port = 5433
```

### Q: What happens to indentation?
**A:** Leading indentation that's **greater than** the parent line's indentation gets preserved in the value. Leading spaces **equal to or less than** the parent are trimmed.

---

## Indentation and Whitespace

### Q: Does CCL support both tabs and spaces?
**A:** Yes. **Each tab character counts as 1 indentation unit**, same as 1 space character.

### Q: Can I mix tabs and spaces?
**A:** Technically yes, but it's not recommended. The specification suggests that **mixed indentation should generate warnings** in strict parsing mode.

### Q: How does CCL handle trailing whitespace?
**A:** 
- **Keys:** Trailing whitespace is trimmed
- **Values:** Leading spaces are trimmed, but trailing whitespace is preserved

**Example:**
```ccl
  key with spaces   =    value with trailing spaces   
```
Results in: `"key with spaces"` → `"value with trailing spaces   "`

---

## Values and Types

### Q: What types does CCL support?
**A:** **Everything is a string at the core level.** CCL doesn't have built-in types - all values are stored as strings.

**Type conversion happens at the application level:**
```gleam
// All these are strings in CCL:
port = 5432          // "5432" 
enabled = true       // "true"
rate = 3.14         // "3.14"

// Your application converts:
let port_int = int.parse(ccl.get_value(obj, "port"))       // Ok(5432)
let enabled_bool = parse_bool(ccl.get_value(obj, "enabled")) // Ok(True)
```

### Q: How should I handle booleans?
**A:** Common conventions:
- **True:** `"true"`, `"yes"`, `"on"`, `"1"`  
- **False:** `"false"`, `"no"`, `"off"`, `"0"`

Case-insensitive parsing is recommended.

### Q: Can values contain equals signs?
**A:** Yes! Only the **first** `=` on a line is special:

```ccl
equation = x = y + 5
url = https://example.com/path?param=value
```

---

## Comments

### Q: How do comments work?
**A:** Comments use special keys like `/=`, `#=`, or `//=`:

```ccl
/= This is a comment
name = value

#= Another comment style  
debug = true

//= Yet another comment style
```

### Q: Are comments part of the data?
**A:** Yes! Comments are regular key-value pairs. To filter them out:

```gleam
// Remove comment entries
let no_comments = list.filter(entries, fn(entry) { 
  !string.starts_with(entry.key, "/") 
})
```

### Q: Can I use other comment styles?
**A:** Any key starting with your chosen prefix works:
- `/=`, `//=`, `#=` are common
- You could use `comment =`, `note =`, etc.

---

## Lists and Arrays

### Q: How do I create lists in CCL?
**A:** Use empty keys:

```ccl
items =
  = first item
  = second item  
  = third item
```

Or numbered keys:
```ccl
items =
  0 = first item
  1 = second item
  2 = third item
```

### Q: Can lists contain different types?
**A:** Yes, since everything is strings:

```ccl
mixed =
  = some text
  = 42
  = true
  = nested value here
```

Your application handles type conversion per item.

### Q: How does CCL handle duplicate keys?
**A:** CCL uses a **two-level strategy** for duplicate keys:

**Core Parsing Level:** Preserves all duplicate entries in order - no merging occurs.

```ccl
user =
  name = alice  
user =
  age = 25
```
**Flat Result:** Two separate entries: `[("user", "\n  name = alice"), ("user", "\n  age = 25")]`

**Object Construction Level:** Applies deep merge for nested objects and accumulation for lists.

**Nested Result:** Single merged object: `{ user: { name: "alice", age: "25" } }`

**Empty Key Lists:** Empty keys accumulate into lists:
```ccl
ports =
  = 8000
  = 8001
```
**Result:** `{ ports: { "": ["8000", "8001"] } }`

**Why Two Levels?** This preserves CCL's mathematical properties (composition, associativity) at the core level while providing intuitive merging behavior for application use.

---

## Comparison with Other Formats

### Q: CCL vs JSON - when should I use each?
**A:**

**Use CCL when:**
- You want human-readable/editable config files
- Multiline strings and comments are important
- Configuration might grow complex over time
- You prefer minimal, composable syntax

**Use JSON when:**
- Structured data exchange with APIs
- You need wide language support
- Schema validation is critical
- Performance is key (parsing speed)

### Q: CCL vs YAML?
**A:**

**CCL advantages:**
- Simpler, more predictable parsing rules
- Mathematical foundation (Category Theory)
- No complex syntax like anchors, aliases, complex scalars

**YAML advantages:**
- Much wider ecosystem support
- More built-in data types
- Better tooling (schemas, validators, etc.)

### Q: CCL vs Environment Variables?
**A:** CCL can complement environment variables:

```ccl
# config.ccl
database.host = ${DATABASE_HOST}
database.port = ${DATABASE_PORT}
```

Your application can expand variables before parsing CCL.

---

## Implementation Details

### Q: What's the parsing algorithm?
**A:**
1. **Parse lines** into key-value pairs based on first `=`
2. **Handle indentation** - lines with more indentation continue previous value
3. **Build objects** using fixed-point recursion to create nested structure

### Q: How does the "fixed point" algorithm work?
**A:** It recursively parses string values that contain CCL syntax until no more CCL structure can be extracted:

```ccl
config = 
  nested = 
    deep = value
```

Becomes: `config` → `{ nested: { deep: "value" } }`

### Q: What about performance?
**A:** CCL parsing is typically fast since:
- Simple line-by-line parsing
- No complex tokenization  
- String operations are well-optimized

For very large configs, consider streaming parsers.

---

## Common Gotchas

### Q: Why doesn't my dotted key work with nesting APIs?
**A:** Because `database.host` is a **flat string key**, not a path to nested structure.

**Won't work:**
```gleam
ccl.get_nested(obj, "database")  // Looks for key "database", not "database.host"
```

**Will work:**
```gleam
ccl.get_value(obj, "database.host")  // Gets the literal key "database.host"
```

### Q: My multiline value has weird indentation behavior
**A:** Remember: indentation **greater than** the parent line continues the value:

```ccl
text = First line
  Second line      // 2 spaces - continues value
    Third line     // 4 spaces - continues value  
next = value       // 0 spaces - new key
```

Result: `text` = `"First line\n  Second line\n    Third line"`

### Q: Empty values vs nested values - what's the difference?
**A:**

```ccl
# Empty value
key =

# Nested value (empty)
section =
  = empty item

# Nested value (with content)  
section =
  sub = value
```

The parser distinguishes based on indented continuation lines.

### Q: Can I escape special characters?
**A:** **No built-in escaping.** CCL values are literal strings:

```ccl
# These are all literal:
path = C:\Program Files\App
json = {"key": "value"}  
equals = a=b=c=d
```

If you need escaping, handle it in your application layer.

### Q: How do I handle Unicode?
**A:** CCL works with any valid UTF-8:

```ccl
名前 = アリス
émoji = 🚀
text = Multi-byte characters work fine: café, naïve, 北京
```

### Q: What about very large configuration files?
**A:** For large configs:
- Consider splitting into multiple CCL files
- Use flat key notation to avoid deep nesting overhead  
- Implement streaming parsing if needed
- Profile your specific use case

---

## Getting Help

### Q: Where can I find more information?
**A:**
- **Original Blog Post:** https://chshersh.com/blog/2025-01-06-the-most-elegant-configuration-language.html
- **Reference Implementation:** https://github.com/chshersh/ccl (OCaml)
- **Test Suite:** Language-agnostic test cases for verification

### Q: How do I report issues or contribute?
**A:** Check the specific implementation you're using:
- This Gleam implementation: Issues in this repository
- Original OCaml: https://github.com/chshersh/ccl
- Language spec questions: Consider reaching out to the original author

---

*This FAQ is maintained alongside the Gleam CCL implementation. Please contribute corrections and additional questions!*