---
title: CCL API
description: CCL API Reference (Proposed) - standardized interface for CCL implementations across different languages.
level: 1
functions: ["parse", "load", "build-hierarchy", "get-string", "get-int", "get-bool", "get-float"]
features: ["comments", "dotted-keys", "unicode"]
llm_summary: "Complete CCL API specification for cross-language implementations with progressive 4-level architecture"
related_tests: "api-essential-parsing.json, api-object-construction.json, api-typed-access.json"
test_repository: "https://github.com/tylerbutler/ccl-test-data"
implementation_examples:
  - language: "Gleam"
    repository: "ccl_gleam"
    files: ["packages/ccl/src/ccl.gleam", "packages/ccl_core/src/ccl_core.gleam"]
  - language: "Go" 
    repository: "ccl-test-data"
    files: ["internal/mock/ccl.go", "cmd/ccl-test-runner/main.go"]
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
Level 3: Common Features      ← build_hierarchy(), dotted keys, merging  
Level 2: Complete Config      ← filter() (optional), combination
Level 1: Entry Parsing        ← parse(), core key-value extraction
```

## Level 1: Entry Parsing (Required)

### Core Types

```typescript
// Core data types
interface Entry {
  key: string
  value: string
}

interface ParseError {
  message: string
  line?: number
  column?: number
}

// Result type for clean error handling
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E }
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
```typescript
const result = parse("database.host = localhost\nserver.port = 8080")
if (result.ok) {
  // Result: [
  //   { key: "database.host", value: "localhost" },
  //   { key: "server.port", value: "8080" }
  // ]
  const entries = result.value
} else {
  console.error(result.error.message)
}
```

## Level 2: Complete Config Language (Standard)

### Functions

#### `filter(entries: Entry[], predicate) → Entry[]`
**Optional:** Filter entries based on key patterns. This function provides a standardized filtering interface for CCL implementations.

**Implementation Note:** Many languages have built-in filtering capabilities (JavaScript `Array.filter()`, Python list comprehensions, C# LINQ, etc.). In such cases, you may choose to:
- Skip implementing `filter()` entirely and document the built-in alternatives
- Provide `filter()` as a convenience wrapper around the native filtering
- Include it for API completeness and cross-language consistency

**Parameters:**
- `entries` - Array of entries to filter
- `predicate` - Function that takes a key string and returns boolean

**Returns:**
- Filtered entry array

**Example:**
```typescript
// Using filter() (if implemented)
const configEntries = filter(entries, key => !key.startsWith("/"))

// Or using native TypeScript/JavaScript:
const configEntries = entries.filter(entry => !entry.key.startsWith("/"))
```

#### `combine(left: Entry[], right: Entry[]) → Entry[]`
Combines two entry arrays, preserving order for duplicate key handling.

**Parameters:**
- `left` - First entry array
- `right` - Second entry array  

**Returns:**
- Combined entry array (`left + right`)

## Level 3: Common Features (Production)

### Core Types

```typescript
// Union type for CCL values
type CCL =
  | { type: 'string'; value: string }
  | { type: 'list'; value: string[] }
  | { type: 'object'; value: Map<string, CCL> }

interface ObjectError {
  message: string
  path?: string
}
```

### Functions

#### `build_hierarchy(entries: Entry[]) → Result<CCL, ObjectError>`
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
```typescript
const entries: Entry[] = [
  { key: "database", value: "\n  host = localhost\n  port = 5432" }
]
const result = buildHierarchy(entries)
if (result.ok) {
  // Result: {
  //   type: 'object',
  //   value: Map({
  //     "database": {
  //       type: 'object',
  //       value: Map({
  //         "host": { type: 'string', value: "localhost" },
  //         "port": { type: 'string', value: "5432" }
  //       })
  //     }
  //   })
  // }
  const objects = result.value
}
```

## Level 4: Advanced Features (Optional)

### Core Access Pattern

**Dual Access Support:** All getters support both hierarchical and dotted access patterns:

```typescript
// Both of these work identically:
getString(ccl, "database", "host")    // Hierarchical access
getString(ccl, "database.host")       // Dotted access
```

### Error Types

```typescript
interface AccessError {
  message: string
  path: string
  errorType: "PathNotFound" | "TypeError" | "ValidationError"
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
```typescript
// Both access patterns work:
const hostResult1 = getString(ccl, "database", "host")      // ✓
const hostResult2 = getString(ccl, "database.host")         // ✓

if (hostResult1.ok) {
  const host = hostResult1.value
}
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

```typescript
// Core reusable functions
function parsePath(...pathArgs: string[]): string[] {
  if (pathArgs.length === 1 && pathArgs[0].includes(".")) {
    return pathArgs[0].split(".")  // Dotted access
  } else {
    return pathArgs                 // Hierarchical access
  }
}

function navigatePath(ccl: CCL, segments: string[]): Result<CCL, AccessError> {
  let current = ccl
  for (const segment of segments) {
    if (current.type !== "object" || !current.value.has(segment)) {
      return {
        ok: false,
        error: {
          message: "Path not found",
          path: segments.join("."),
          errorType: "PathNotFound" as const
        }
      }
    }
    current = current.value.get(segment)!
  }
  return { ok: true, value: current }
}

function getRawValue(ccl: CCL, ...path: string[]): Result<string, AccessError> {
  const segments = parsePath(...path)
  const result = navigatePath(ccl, segments)
  if (!result.ok) return result

  if (result.value.type !== "string") {
    return {
      ok: false,
      error: {
        message: "Value is not a string",
        path: segments.join("."),
        errorType: "TypeError" as const
      }
    }
  }
  return { ok: true, value: result.value.value }
}

// All typed getters reuse getRawValue
function getInt(ccl: CCL, ...path: string[]): Result<number, AccessError> {
  const rawResult = getRawValue(ccl, ...path)
  if (!rawResult.ok) return rawResult

  const parsed = parseInt(rawResult.value)
  if (isNaN(parsed)) {
    return {
      ok: false,
      error: {
        message: "Invalid integer",
        path: path.join("."),
        errorType: "ValidationError" as const
      }
    }
  }
  return { ok: true, value: parsed }
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

Validate your implementation against the official JSON test suite in the [ccl-test-data repository](https://github.com/your-repo/ccl-test-data):

**Test Suite Overview:**
- **452 test assertions** across **167 tests** in **10 JSON files**
- **Feature-based tagging** for progressive implementation (`function:*`, `feature:*`, `behavior:*`)
- **Language-agnostic format** with counted assertions for verification

**Key Test Files:**
- `api-essential-parsing.json` - Core parsing functionality (Level 1)
- `api-comprehensive-parsing.json` - Thorough parsing with edge cases
- `api-processing.json` - Entry composition and processing (Level 2)
- `api-object-construction.json` - Nested object building (Level 3)
- `api-typed-access.json` - Type-aware value extraction (Level 4)

**Progressive Implementation Strategy:**
1. Start with `function:parse` tests (Level 1 - basic parsing)
2. Add `function:make-objects` tests (Level 3 - object construction)
3. Add typed access function tests (Level 4 - `function:get-string`, `function:get-int`, etc.)
4. Incrementally add optional features (`feature:comments`, `feature:dotted-keys`)

Each test includes required `count` fields for assertion verification and structured tags for precise test selection.

## Related Documentation

- **[Implementing CCL](/implementing-ccl)** - Step-by-step implementation guide with level details
- **[Getting Started](/getting-started)** - Understanding CCL's design principles and syntax
- **[Test Architecture](/test-architecture)** - Using the test suite for validation
- **[Syntax Reference](/syntax-reference)** - Quick lookup for CCL syntax patterns

## Quick Reference

### API Functions by Level

| Level | Function | Purpose |
|-------|----------|---------|
| **Level 1** | `parse(text)` | Convert text to key-value entries |
| **Level 2** | `filter(entries, predicate)` | Remove unwanted entries (optional) |
| **Level 2** | `combine(left, right)` | Combine entry arrays |
| **Level 3** | `build_hierarchy(entries)` | Build hierarchical structure |
| **Level 4** | `get_string(ccl, ...path)` | Type-safe string access |
| **Level 4** | `get_int(ccl, ...path)` | Type-safe integer access |
| **Level 4** | `get_bool(ccl, ...path)` | Type-safe boolean access |

### Implementation Recommendations

- **Start with Level 2**: Covers most use cases
- **Add Level 3**: For production systems needing dotted keys
- **Consider Level 4**: For type safety and validation
- **Adapt naming**: Match your language's conventions

**Note:** The official JSON test suite in ccl-test-data references the function names and patterns described in this API reference. While you can adapt the names to your language, the test tag structure (`function:parse`, `function:get-string`, etc.) assumes this API structure for consistency.

## Philosophy

**Consistency over Convention:** While specific function names and error handling should match your language ecosystem, the **behavior** and **level structure** should remain consistent across implementations.

**Progressive Implementation:** Start with Level 1, add levels as needed. Many use cases only need Level 1 + Level 3.

**User Experience First:** Prioritize what feels natural in your language over strict API conformity.