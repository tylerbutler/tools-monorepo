---
title: Implementing CCL
description: A guide for language authors to implement a CCL parser using the feature-based test architecture and comprehensive test suite.
level: 1
functions: ["parse", "build-hierarchy", "get-string", "get-int"]
features: ["comments", "dotted-keys", "unicode"]
llm_summary: "Comprehensive implementation guide for CCL parsers with progressive 4-level architecture and 452 test assertions"
related_tests: "api-essential-parsing.json, api-comprehensive-parsing.json, api-processing.json, api-object-construction.json, api-typed-access.json"
test_repository: "https://github.com/tylerbutler/ccl-test-data"
implementation_examples:
  - language: "Gleam"
    repository: "ccl_gleam" 
    files: ["packages/ccl/src/ccl.gleam", "test/ccl_gleam_test.gleam"]
  - language: "Go"
    repository: "ccl-test-data"
    files: ["internal/mock/ccl.go", "internal/generator/"]
---

# Implementing CCL - A Guide for Language Authors

## Quick Start

1. **Study the specification** - Read the [Getting Started Guide](/getting-started)
2. **Choose your API approach** - Organize around core APIs rather than implementation levels
3. **Use the test suite** - Language-agnostic JSON tests validate your implementation
4. **Follow the reference** - OCaml reference implementation at https://github.com/chshersh/ccl
5. **Check the API guide** - See [API Reference](/api-reference) for recommended patterns

## Core CCL APIs

CCL implementations should organize around core APIs rather than arbitrary levels. This API-focused approach provides clearer implementation targets and better composability.

### Essential APIs

**Core Parsing APIs:**
- `parse(text)` → `List<Entry>` - Convert CCL text to flat key-value entries
- `filter(entries, predicate)` → `List<Entry>` - Filter entries (e.g., remove comments)
- `build_hierarchy(entries)` → `Object` - Convert flat entries to nested structure

**Access APIs:**
- `get(object, path)` → `Value` - Retrieve values by dot-notation path
- `get_string(object, path)` → `String` - Type-safe string access
- `get_int(object, path)` → `Integer` - Type-safe integer access with parsing

### API Implementation Priority

| Priority | APIs | Use Case | Implementation Time |
|----------|------|----------|-------------------|
| **Essential** | `parse`, `filter`, `build_hierarchy` | Basic CCL support | 3-5 days |
| **Recommended** | `get`, error handling | Production usage | +2-3 days |
| **Advanced** | Typed accessors, validation | Type safety | +1-2 weeks |

**Recommendation**: Start with essential APIs for a functional CCL implementation, then add recommended APIs for production readiness.

## Feature-Based Test Architecture

The CCL test suite uses **structured tagging** for precise implementation targeting:

### Tag Categories

#### Function Tags (`function:*`) - Core CCL APIs:
- `function:parse` - Essential: Text to entry parsing
- `function:filter`, `function:combine` - Essential: Entry processing
- `function:build-hierarchy` - Essential: Object construction
- `function:get-string`, `function:get-int`, `function:get-bool` - Advanced: Typed access

#### Feature Tags (`feature:*`) - Optional language features:
- `feature:comments` - `/=` comment syntax
- `feature:dotted-keys` - `foo.bar.baz` key syntax
- `feature:empty-keys` - `= value` anonymous list items
- `feature:multiline` - Multi-line value support
- `feature:unicode` - Unicode content handling

### Progressive Implementation Strategy

1. **Start minimal**: `function:parse` only (Level 1)
2. **Add hierarchy**: `function:build-hierarchy` (Level 2)
3. **Add features**: `feature:comments`, `feature:dotted-keys` incrementally
4. **Add typing**: `function:get-string`, `function:get-int`, etc. (Level 4)

## Implementation Roadmap

Choose your CCL implementation level based on your needs:

### Level 1: Entry Parsing
**Goal:** Parse CCL text into flat key-value entries
**What you get:** The 4 core constructs (key-value pairs, empty values, empty keys, multiline values)
**Use case:** Rapid prototyping, simple configurations, custom processing

```typescript
const result = parse(text)
if (result.ok) {
  const entries = result.value  // Entry[] with all key-value pairs
}
```

**When to use Level 1:**
- **Rapid prototyping**: Get CCL parsing working quickly
- **Simple configurations**: Flat or mostly flat config files
- **Custom processing**: You want to handle object construction yourself
- **Embedded systems**: Minimal memory/code footprint needed

Start here - handles the 4 core constructs and provides the foundation for all higher-level CCL operations.

#### Essential Algorithm
```typescript
function parse(text: string): Result<Entry[], ParseError> {
  const entries: Entry[] = []
  const lines = text.split('\n')
  
  for (const line of lines) {
    if (line.includes('=')) {
      const [key, value] = line.split('=', 2)
      const trimmedKey = key.trim()
      const initialValue = value.trim()

      // Handle multiline continuation
      while (nextLineIsContinuation(lines, currentIndex)) {
        const continuation = getContinuationContent(lines, currentIndex + 1)
        value += "\n" + continuation
        current_index += 1
      }
      
      entries.append(Entry(key, value))
    }
  }
  
  return Ok(entries)
}
```

#### Key Implementation Details

**Line Splitting:**
- Preserve line ending information (for error reporting)
- Handle Unix (`\n`), Windows (`\r\n`), and legacy Mac (`\r`) line endings
- Normalize to consistent internal representation

**Key Extraction:**
- Split on first `=` character only
- Trim whitespace from keys
- Empty keys are valid (used for lists)

**Value Extraction:**
- Preserve leading/trailing whitespace in values
- Handle values containing `=` characters
- Empty values are valid

**Continuation Lines:**
- Lines with indentation greater than parent continue the value
- Preserve relative indentation in multiline values
- Handle mixed tabs and spaces (warn in strict mode)

### Level 2: Complete Config Language
**Goal:** Everything needed for practical configuration
**What you get:** Level 1 + comment filtering + hierarchy construction

```typescript
const parseResult = parse(text)                        // Essential API
if (!parseResult.ok) throw parseResult.error

const configEntries = entries.filter(e => !e.key.startsWith('/'))  // Filter unwanted keys
const hierarchyResult = buildHierarchy(configEntries)               // Build hierarchy
if (hierarchyResult.ok) {
  const objects = hierarchyResult.value  // Nested configuration object
}
```

**When to use Level 2:**
- **Production configurations**: Real applications with nesting and comments
- **Standard usage**: Covers 95% of configuration use cases
- **Team adoption**: Good balance of features vs complexity
- **Migration from other formats**: Provides expected config language features

### Level 3: Common Features
**Goal:** Features most implementations want
**What you get:** Level 2 + dotted keys + merging + edge cases

```typescript
// Dotted key access
const host1Result = get(config, "database", "host")      // Hierarchical
const host2Result = get(config, "database.host")         // Dotted

// Configuration merging
const final = merge(baseConfig, envOverrides)
```

**When to use Level 3:**
- **Production systems**: Complex configurations with multiple sources
- **Library implementations**: Providing CCL as a dependency
- **Enterprise applications**: Need robust error handling
- **Configuration management**: Merging configs from multiple sources

#### Fixed-Point Algorithm
```pseudocode
function build_hierarchy(entries: List<Entry>) -> CCL {
  result = {}
  
  for entry in entries {
    if entry.value.contains_ccl_syntax() {
      // Recursively parse nested content
      nested_entries = parse(entry.value)
      nested_object = build_hierarchy(nested_entries)
      result = merge_into_result(result, entry.key, nested_object)
    } else {
      result = merge_into_result(result, entry.key, entry.value)
    }
  }
  
  return result
}

function containsCCLSyntax(value: string): boolean {
  // Check if value looks like CCL (contains "=")
  const lines = value.split('\n')
  for (const line of lines) {
    if (line.trim().includes('=')) {
      return true
    }
  }
  return false
}
```

#### Duplicate Key Handling
```typescript
function mergeIntoResult(result: CCL, key: string, value: any): void {
  if (key === "") {
    // Empty keys create lists
    if (result[""] !== undefined) {
      result[""].push(value)
    } else {
      result[""] = [value]
    }
  } else if (result[key] !== undefined) {
    // Merge duplicate keys
    result[key] = deepMerge(result[key], value)
  } else {
    result[key] = value
  }
}
```

### Level 4: Advanced Features
**Goal:** Nice-to-have, implementation-specific features
**What you get:** Level 3 + typed APIs + validation + extensions

```typescript
// Type-safe access with consistent error handling
const portResult = getInt(config, "database", "port")    // Returns Result<number, Error>
const debugResult = getBool(config, "debug")             // Handles "true"/"false"/"1"/"0"

if (portResult.ok) {
  const port = portResult.value
}

// Schema validation
validateSchema(config, schema)               // Ensure structure/types
```

**When to use Level 4:**
- **Specialized applications**: Need type safety or validation
- **Large configurations**: Schema validation prevents errors
- **Developer experience**: Better IDE support and error messages
- **Library features**: Providing advanced CCL functionality

#### Key Filtering (Including Comments)

**Important**: CCL APIs provide general `filter()`, not comment-specific functions. `/=` is the standard comment marker, but filtering is flexible:

```typescript
// General-purpose key filtering function
function filter(entries: Entry[], predicate: (key: string) => boolean): Entry[] {
  return entries.filter(entry => predicate(entry.key))
}

// Standard comment filtering (/= is standard marker)
function getConfigEntries(entries: Entry[]): Entry[] {
  return filter(entries, key => !key.startsWith("/"))
}

// Custom comment filtering
function filter_docs(entries: List<Entry>) -> List<Entry> {
  return filter(entries, key -> !key.starts_with("doc"))
}

// Remove debug and temp entries
function filter_dev_keys(entries: List<Entry>) -> List<Entry> {
  return filter(entries, key -> 
    !key.starts_with("debug") && !key.starts_with("temp"))
}
```

#### Entry Composition
```pseudocode
function combine(left: List<Entry>, right: List<Entry>) -> List<Entry> {
  // Simple concatenation - merging happens at object level
  return left + right
}
```

### Level 4: Advanced Features  
**Goal:** Nice-to-have, implementation-specific features  
**Use case:** Specialized applications, library features

Level 3 + typed APIs + validation + custom extensions.

#### Dotted Key Support
**Test Suite:** `tests/features/dotted-keys.json` (18 tests)  
Enable dual access patterns (`database.host` ↔ hierarchical).

#### Entry Processing  
**Test Suite:** `tests/features/processing.json` (21 tests)  
Advanced composition and merging capabilities.

#### Type-Safe Access
**Test Suite:** `tests/features/typed-access.json` (17 tests)  
Typed getters with consistent error handling.

#### Type-Safe Accessors

**Dual Access Pattern Support:**
CCL should support both hierarchical and dotted access patterns as first-class alternatives:

```ccl
# Both syntaxes create the same hierarchical structure
database.host = localhost    # Dotted syntax  
database =                   # Nested syntax
  port = 5432
```

**API Design - Both Access Patterns:**
```pseudocode
// Hierarchical access
host = get_string(ccl, "database", "host")     // ✓ Works
port = get_int(ccl, "database", "port")        // ✓ Works

// Dotted access  
host = get_string(ccl, "database.host")        // ✓ Also works
port = get_int(ccl, "database.port")           // ✓ Also works
```

#### Reusable Implementation Pattern

**Core Navigation Logic:**
```pseudocode
// Reusable path parsing - handles both access patterns
function parse_path(...path_args) -> List<string> {
  if path_args.length == 1 and path_args[0].contains(".") {
    // Dotted access: "database.host" -> ["database", "host"]
    return path_args[0].split(".")
  } else {
    // Hierarchical access: ("database", "host") -> ["database", "host"]
    return path_args
  }
}

// Reusable navigation - works for both patterns
function navigate_path(ccl_obj, path_segments) -> Result<Value, Error> {
  current = ccl_obj
  for segment in path_segments {
    if current is not object or segment not in current {
      return Error("Path not found: " + join(path_segments, "."))
    }
    current = current[segment]
  }
  return Ok(current)
}

// Base getter that all typed getters reuse
function get_raw_value(ccl: CCL, ...path) -> Result<Value, Error> {
  segments = parse_path(...path)
  return navigate_path(ccl, segments)
}
```

**Typed Getters Using Shared Logic:**
```pseudocode
function get_string(ccl: CCL, ...path) -> Result<string, Error> {
  value = get_raw_value(ccl, ...path)
  match value {
    Ok(string) -> Ok(string)
    Error(e) -> Error(e)
  }
}

function get_int(ccl: CCL, ...path) -> Result<int, Error> {
  value = get_raw_value(ccl, ...path)
  match value {
    Ok(str) -> parse_int(str) or Error("Invalid integer: " + str)
    Error(e) -> Error(e)
  }
}

function get_bool(ccl: CCL, ...path) -> Result<bool, Error> {
  value = get_raw_value(ccl, ...path)
  match value {
    Ok(str) -> match str.to_lowercase() {
      "true" | "yes" | "on" | "1" -> Ok(true)
      "false" | "no" | "off" | "0" -> Ok(false)
      _ -> Error("Invalid boolean: " + str)
    }
    Error(e) -> Error(e)
  }
}
```

**Language-Specific Variations:**

*Rust:*
```rust
fn get_typed<T: FromStr>(obj: &CCL, path: &[&str]) -> Result<T, CCLError> {
    let value = get_raw_value(obj, path)?;
    value.parse().map_err(|_| CCLError::TypeError)
}
```

*TypeScript:*
```typescript
function getTyped<T>(obj: CCL, parser: (s: string) => T, ...path: string[]): T {
    const value = getRawValue(obj, ...path);
    return parser(value);
}
```

**Benefits of This Approach:**
- Single navigation algorithm handles both access patterns
- Consistent error handling across all getters
- Easy to extend with new typed getters
- Testable components (navigation vs type conversion)
- Maximum code reuse between getter functions
```

## Language-Specific Considerations

### Error Handling Patterns

**Rust:**
```rust
type ParseResult<T> = Result<T, ParseError>;
type AccessResult<T> = Result<T, AccessError>;
```

**Go:**
```go
func Parse(text string) ([]Entry, error)
func GetString(ccl CCL, path string) (string, error)
```

**Python:**
```python
def parse(text: str) -> Union[List[Entry], ParseError]
def get_string(ccl: CCL, path: str) -> Union[str, AccessError]
```

**JavaScript:**
```javascript
function parse(text) { /* returns entries or throws ParseError */ }
function getString(ccl, path) { /* returns string or throws AccessError */ }
```

### Data Structure Design

**Immutable Languages (Haskell, OCaml):**
```haskell
data Entry = Entry String String
data CCL = CCLString String | CCLList [String] | CCLObject (Map String CCL)
```

**Object-Oriented Languages (Java, C#):**
```java
class Entry {
  public final String key;
  public final String value;
}

interface CCLValue {}
class CCLString implements CCLValue { String value; }
class CCLList implements CCLValue { List<String> items; }
class CCLObject implements CCLValue { Map<String, CCLValue> fields; }
```

## Testing Your Implementation

### Running the Test Suite

Each level has a dedicated test file with specific format:

```json
{
  "tests": [
    {
      "name": "basic_key_value",
      "input": "key = value",
      "expected": [
        {"key": "key", "value": "value"}
      ],
      "meta": {
        "level": 1,
        "tags": ["basic"]
      }
    }
  ]
}
```

### Test Runner Implementation
```pseudocode
function run_test_suite(test_file: string) {
  test_data = load_json(test_file)
  
  for test in test_data.tests {
    try {
      // Level 1 tests
      if test.expected exists {
        actual = parse(test.input)
        assert_equal(actual, test.expected)
      }
      
      // Level 3 tests  
      if test.expected_nested exists {
        entries = parse(test.input)
        objects = build_hierarchy(entries)
        assert_equal(objects, test.expected_nested)
      }
      
      // Error tests
      if test.expected_error exists {
        result = parse(test.input)
        assert_error(result)
      }
      
      print("✅ " + test.name)
    } catch (error) {
      print("❌ " + test.name + ": " + error)
    }
  }
}
```

### Progressive Testing Strategy

1. **Start with essential tests:**
   ```bash
   # Run essential parsing tests first
   validate_tests("tests/core/essential-parsing.json")     # 18 tests
   ```

2. **Add comprehensive coverage:**
   ```bash
   # Run core functionality tests
   validate_tests("tests/core/essential-parsing.json")        # 18 tests
   validate_tests("tests/core/object-construction.json")      # 8 tests
   validate_tests("tests/core/comprehensive-parsing.json")    # 30 tests
   
   # Add optional features as needed
   validate_tests("tests/features/dotted-keys.json")          # 18 tests
   validate_tests("tests/features/typed-access.json")         # 17 tests
   ```

3. **Validate error handling:**
   ```bash
   validate_tests("tests/integration/errors.json")            # 5 tests
   ```

## Performance Considerations

### Parsing Performance
- **Line-by-line processing** is typically fastest for CCL
- **Minimize string allocations** during key/value extraction
- **Lazy evaluation** for nested object construction
- **Streaming parsers** for very large configuration files

### Memory Usage
- **Share string data** between entries when possible
- **Use rope/gap buffer structures** for large multiline values
- **Implement copy-on-write** for object merging operations

### Optimization Strategies
```pseudocode
// Fast path for flat configurations (no nesting)
if !text.contains_indented_lines() {
  return parse_flat_only(text)  // Skip object construction
}

// Lazy object construction
class LazyObject {
  entries: List<Entry>
  constructed: Option<CCL>
  
  function get(key: string) {
    if !constructed {
      constructed = Some(build_hierarchy(entries))
    }
    return constructed.get(key)
  }
}
```

## Common Implementation Pitfalls

1. **Incorrect continuation handling** - Ensure indentation comparison is exact
2. **Wrong equals splitting** - Only split on first `=`, preserve others in value
3. **Unicode issues** - Handle UTF-8 properly, including multi-byte characters
4. **Path navigation errors** - Handle nested access edge cases
5. **Type conversion edge cases** - Boolean parsing, integer overflow
6. **Memory leaks** - In languages without GC, manage string lifetimes carefully

## API Design Guidelines

### Consistent Naming
- `parse()` for Level 1 entry parsing
- `filter()` for Level 2 general key filtering (not `filter_comments()`)
- `build_hierarchy()` for Level 3 object construction  
- `get_string()`, `get_int()`, `get_bool()` for Level 4 typed access

### Error Messages
Provide helpful error messages with:
- **Line/column numbers** for parse errors
- **Key paths** for access errors  
- **Expected vs actual** for type errors
- **Suggestions** for common mistakes

### Documentation Requirements
- **API documentation** with examples
- **Migration guide** from popular formats
- **Performance characteristics** and limitations
- **Thread safety** guarantees (if applicable)

## Validation and Release

### Pre-Release Checklist
- [ ] All test suites pass (106+ tests total)
- [ ] Error messages are helpful and consistent
- [ ] Performance is acceptable for target use cases
- [ ] Documentation is complete
- [ ] Thread safety is documented/implemented
- [ ] Memory usage is reasonable

### Publishing Guidelines
- **Semantic versioning** with level support clearly indicated
- **Clear API stability** promises
- **Examples and tutorials** for common use cases
- **Contribution guidelines** for community involvement

## Related Documentation

- **[Getting Started](/getting-started)** - Understanding CCL's foundation and basic syntax
- **[API Reference](/api-reference)** - Recommended API patterns and conventions
- **[Test Architecture](/test-architecture)** - Using the test suite for validation
- **[CCL FAQ](/ccl-faq)** - Common implementation questions and gotchas

The CCL specification and test suite provide everything needed to build a robust, compliant implementation in any programming language. Focus on correctness first, then optimize for your language's specific performance characteristics.