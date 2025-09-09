---
title: CCL API
description: CCL API Reference (Proposed) - standardized interface for CCL implementations across different languages.
---

> **⚠️ Important Note**
> 
> This is an **example API structure** that has proven useful in CCL implementations. **Implementers are not required to follow this exactly** - adapt it to fit your language ecosystem, conventions, and user expectations.
>
> For example:
> - Use `camelCase` vs `snake_case` as appropriate for your language
> - Return exceptions vs Result types based on language idioms
> - Use builders, fluent APIs, or other patterns that fit your ecosystem
> - Add language-specific conveniences (generics, operator overloading, etc.)
>
> **The goal is CCL compatibility, not API uniformity.**

## Organization

The CCL API is organized into 4 levels, each building on the previous. You can implement any subset that makes sense for your use case.

```
Level 4: Advanced Features    ← get_string(), get_int(), get_bool()
Level 3: Common Features      ← make_objects(), dotted keys, merging  
Level 2: Complete Config      ← filter_keys(), object construction
Level 1: Entry Parsing        ← parse(), core key-value extraction
```

## Level 1: Entry Parsing (Required)

### Core Types

```pseudocode
Entry {
  key: string
  value: string
}

ParseError {
  message: string
  line?: number
  column?: number
}
```

### Functions

#### `parse(text: string) → Result<Entry[], ParseError>`
Converts raw CCL text into flat key-value entries.

**Parameters:**
- `text` - Raw CCL configuration text

**Returns:**
- Success: Array of `Entry` objects
- Failure: `ParseError` with descriptive message and position

**Example:**
```pseudocode
entries = parse("database.host = localhost\nserver.port = 8080")
// Result: [
//   Entry("database.host", "localhost"),
//   Entry("server.port", "8080")
// ]
```

## Level 2: Complete Config Language (Standard)

### Functions

#### `filter_keys(entries: Entry[], predicate) → Entry[]`
General-purpose function to filter entries based on key patterns. CCL APIs provide this flexible function rather than comment-specific filtering.

**Parameters:**
- `entries` - Array of entries to filter
- `predicate` - Function that takes a key string and returns boolean

**Returns:**
- Filtered entry array

**Example:**
```pseudocode
// Standard comment filtering (/ = standard marker)  
config_entries = filter_keys(entries, key => !key.startsWith("/"))

// Custom filtering patterns
no_debug = filter_keys(entries, key => !key.startsWith("debug"))
clean = filter_keys(entries, key => 
  !key.startsWith("debug") && !key.startsWith("temp"))

**Note:** Most CCL APIs provide `filter_keys()` rather than `filter_comments()` to keep the API minimal and flexible.
```

#### `compose(left: Entry[], right: Entry[]) → Entry[]`
Combines two entry arrays, preserving order for duplicate key handling.

**Parameters:**
- `left` - First entry array
- `right` - Second entry array  

**Returns:**
- Combined entry array (`left + right`)

## Level 3: Common Features (Production)

### Core Types

```pseudocode
CCL = 
  | CCLString(string)
  | CCLList(string[])
  | CCLObject(Map<string, CCL>)

ObjectError {
  message: string
  path?: string
}
```

### Functions

#### `make_objects(entries: Entry[]) → Result<CCL, ObjectError>`
Converts flat entries into hierarchical nested objects using fixed-point algorithm.

**Parameters:**
- `entries` - Flat array of key-value entries

**Returns:**
- Success: Nested `CCL` object structure
- Failure: `ObjectError` for malformed nested syntax

**Behavior:**
- Recursively parses values containing CCL syntax
- Merges duplicate keys into objects or lists
- Handles empty keys (`= value`) as list items

**Example:**
```pseudocode
entries = [Entry("database", "\n  host = localhost\n  port = 5432")]
objects = make_objects(entries)
// Result: CCLObject({
//   "database": CCLObject({
//     "host": CCLString("localhost"),
//     "port": CCLString("5432")
//   })
// })
```

## Level 4: Advanced Features (Optional)

### Core Access Pattern

**Dual Access Support:** All getters support both hierarchical and dotted access patterns:

```pseudocode
// Both of these work identically:
get_string(ccl, "database", "host")    // Hierarchical access
get_string(ccl, "database.host")       // Dotted access
```

### Error Types

```pseudocode
AccessError {
  message: string
  path: string
  error_type: "PathNotFound" | "TypeError" | "ValidationError"
}
```

### Functions

#### `get_string(ccl: CCL, ...path) → Result<string, AccessError>`
Extracts string value from CCL object.

**Parameters:**
- `ccl` - CCL object to search
- `...path` - Variable path arguments (hierarchical or single dotted string)

**Returns:**
- Success: String value at path
- Failure: `AccessError` if path not found

**Example:**
```pseudocode
// Both access patterns work:
host = get_string(ccl, "database", "host")      // ✓
host = get_string(ccl, "database.host")         // ✓
```

#### `get_int(ccl: CCL, ...path) → Result<int, AccessError>`
Extracts integer value with automatic parsing.

**Parameters:**
- `ccl` - CCL object to search
- `...path` - Variable path arguments

**Returns:**
- Success: Parsed integer value
- Failure: `AccessError` for missing path or invalid integer

**Parsing Rules:**
- Accepts standard integer formats: `42`, `-123`, `+456`
- Rejects floats, non-numeric strings

#### `get_bool(ccl: CCL, ...path) → Result<bool, AccessError>`
Extracts boolean value with flexible parsing.

**Parameters:**
- `ccl` - CCL object to search  
- `...path` - Variable path arguments

**Returns:**
- Success: Parsed boolean value
- Failure: `AccessError` for missing path or invalid boolean

**Parsing Rules:**
- **True values:** `"true"`, `"yes"`, `"on"`, `"1"` (case-insensitive)
- **False values:** `"false"`, `"no"`, `"off"`, `"0"` (case-insensitive)

#### `get_float(ccl: CCL, ...path) → Result<float, AccessError>`
Extracts floating-point value with automatic parsing.

**Parameters:**
- `ccl` - CCL object to search
- `...path` - Variable path arguments

**Returns:**
- Success: Parsed float value
- Failure: `AccessError` for missing path or invalid number

## Implementation Patterns

### Recommended Code Reuse Structure

```pseudocode
// Core reusable functions
function parse_path(...path_args) → string[] {
  if path_args.length == 1 and path_args[0].contains(".") {
    return path_args[0].split(".")  // Dotted access
  } else {
    return path_args                 // Hierarchical access
  }
}

function navigate_path(ccl: CCL, segments: string[]) → Result<CCL, AccessError> {
  current = ccl
  for segment in segments {
    current = current.get(segment) or return Error("Path not found")
  }
  return Ok(current)
}

function get_raw_value(ccl: CCL, ...path) → Result<string, AccessError> {
  segments = parse_path(...path)
  value = navigate_path(ccl, segments)?
  return value.as_string()
}

// All typed getters reuse get_raw_value
function get_int(ccl: CCL, ...path) → Result<int, AccessError> {
  raw = get_raw_value(ccl, ...path)?
  return parse_int(raw) or Error("Invalid integer")
}
```

### Error Handling Conventions

**Result Types (Rust-style):**
```rust
type ParseResult<T> = Result<T, ParseError>;
type AccessResult<T> = Result<T, AccessError>;
```

**Exception-based (Java/Python-style):**
```java
// Throw CCLParseException, CCLAccessException
String getValue(CCL ccl, String... path) throws CCLAccessException
```

**Multiple Return Values (Go-style):**
```go
func GetString(ccl CCL, path ...string) (string, error)
```

## Language-Specific Adaptations

### Type System Integration

**Generic Languages:**
```typescript
function get<T>(ccl: CCL, parser: (s: string) => T, ...path: string[]): T
```

**Builder Patterns:**
```java
CCL.from(text)
   .filterComments()
   .getInt("server", "port")
```

**Fluent APIs:**
```csharp  
var port = ccl.Get("server").AsInt("port");
```

### Naming Conventions

| Pattern | Example Languages | Function Names |
|---------|------------------|----------------|
| `snake_case` | Python, Rust | `parse()`, `get_string()` |  
| `camelCase` | JavaScript, Java | `parse()`, `getString()` |
| `PascalCase` | C#, Go | `Parse()`, `GetString()` |

### Error Integration

**Language Native:**
- **Python:** Raise `CCLError` exceptions
- **Rust:** Return `Result<T, CCLError>` 
- **Go:** Return `(value, error)` tuples
- **Java:** Throw checked `CCLException`

## Testing Your Implementation

Validate your API against the comprehensive test suite in `/tests/`:

- **Level 1:** `level-1-parsing.json` (48 tests)
- **Level 2:** `level-2-processing.json` (28 tests)  
- **Level 3:** `level-3-objects.json` (8 tests)
- **Level 4:** `level-4-typed.json` (17 tests)

Each test provides `input`, `expected` output, and metadata for systematic validation.

## Related Documentation

- **[Implementation Levels](implementation-levels.md)** - Choose which level(s) to implement
- **[Implementing CCL](implementing-ccl.md)** - Step-by-step implementation guide  
- **[Core Concepts](core-concepts.md)** - Understanding CCL's design principles
- **[Getting Started](getting-started.md)** - User-facing syntax and examples

## Quick Reference

### API Functions by Level

| Level | Function | Purpose |
|-------|----------|---------|
| **Level 1** | `parse(text)` | Convert text to key-value entries |
| **Level 2** | `filter_keys(entries, predicate)` | Remove unwanted entries |
| **Level 2** | `compose_entries(left, right)` | Combine entry arrays |
| **Level 3** | `make_objects(entries)` | Build hierarchical structure |
| **Level 4** | `get_string(ccl, ...path)` | Type-safe string access |
| **Level 4** | `get_int(ccl, ...path)` | Type-safe integer access |
| **Level 4** | `get_bool(ccl, ...path)` | Type-safe boolean access |

### Implementation Recommendations

- **Start with Level 2**: Covers most use cases
- **Add Level 3**: For production systems needing dotted keys
- **Consider Level 4**: For type safety and validation
- **Adapt naming**: Match your language's conventions

**Note:** Test documentation and examples throughout this repository reference the function names and patterns described in this API reference. While you can adapt the names to your language, the test descriptions assume this structure for consistency.

## Philosophy

**Consistency over Convention:** While specific function names and error handling should match your language ecosystem, the **behavior** and **level structure** should remain consistent across implementations.

**Progressive Implementation:** Start with Level 1, add levels as needed. Many use cases only need Level 1 + Level 3.

**User Experience First:** Prioritize what feels natural in your language over strict API conformity.