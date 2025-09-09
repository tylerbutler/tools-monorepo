---
title: Implementing CCL
description: A guide for language authors to implement a CCL parser using the feature-based test architecture and comprehensive test suite.
---

# Implementing CCL - A Guide for Language Authors

## Quick Start

1. **Study the specification** - Read the [Getting Started Guide](/getting-started) and [Core Concepts](/core-concepts)
2. **Choose your implementation path** - See [Implementation Levels](/implementation-levels) to pick your level  
3. **Use the test suite** - Language-agnostic JSON tests validate your implementation
4. **Follow the reference** - OCaml reference implementation at https://github.com/chshersh/ccl
5. **Check the API guide** - See [API Reference](/api-reference) for recommended patterns

## Feature-Based Test Architecture

The CCL test suite uses **structured tagging** for precise implementation targeting with **452 assertions** across **167 tests**:

### Tag Categories

#### Function Tags (`function:*`) - Required CCL functions:
- `function:parse` - Basic key-value parsing (Level 1)
- `function:filter`, `function:combine`, `function:expand-dotted` - Entry processing (Level 2) 
- `function:build-hierarchy` - Object construction (Level 3)
- `function:get-string`, `function:get-int`, `function:get-bool`, `function:get-float`, `function:get-list` - Typed access (Level 4)
- `function:pretty-print` - Formatting (Level 5)

#### Feature Tags (`feature:*`) - Optional language features:
- `feature:comments` - `/=` comment syntax
- `feature:dotted-keys` - `foo.bar.baz` key syntax
- `feature:empty-keys` - `= value` anonymous list items
- `feature:multiline` - Multi-line value support
- `feature:unicode` - Unicode content handling

#### Behavior Tags (`behavior:*`) - Implementation choices (mutually exclusive):
- `behavior:crlf-preserve` vs `behavior:crlf-normalize` - Line ending handling
- `behavior:tabs-preserve` vs `behavior:tabs-to-spaces` - Tab handling
- `behavior:strict-spacing` vs `behavior:loose-spacing` - Whitespace sensitivity

### Progressive Implementation Strategy

1. **Start minimal**: `function:parse` only (Level 1)
2. **Add objects**: `function:build-hierarchy` (Level 3)
3. **Add typing**: `function:get-string`, `function:get-int`, etc. (Level 4)
4. **Add features**: `feature:comments`, `feature:dotted-keys` incrementally
5. **Choose behaviors**: Select one option per behavioral category

## Implementation Roadmap

Choose your CCL implementation level based on your needs:

### Level 1: Entry Parsing  
**Goal:** Parse CCL text into flat key-value entries  
**Test File:** `api-essential-parsing.json` (part of 452 total assertions)  
**Function Tag:** `function:parse`  
**Use case:** Rapid prototyping, simple configurations

Start here - handles the 4 core constructs and provides the foundation for all higher-level CCL operations.

#### Essential Algorithm
```pseudocode
function parse(text: string) -> Result<List<Entry>, ParseError> {
  entries = []
  lines = split_lines_with_positions(text)
  
  for line in lines {
    if line.contains("=") {
      (key, value) = split_on_first_equals(line)
      key = trim_key(key)
      value = extract_initial_value(value)
      
      // Handle multiline continuation
      while next_line_is_continuation(lines, current_index) {
        continuation = get_continuation_content(lines, current_index + 1)
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

### Level 2: Entry Processing
**Goal:** Advanced entry processing and composition  
**Test Files:** `api-processing.json`, `api-comments.json`  
**Function Tags:** `function:filter`, `function:combine`, `function:expand-dotted`  
**Feature Tags:** `feature:comments`, `feature:dotted-keys`  
**Use case:** Advanced processing workflows and comment support

### Level 3: Object Construction  
**Goal:** Convert flat entries into nested CCL objects  
**Test File:** `api-object-construction.json`  
**Function Tag:** `function:make-objects`  
**Use case:** Hierarchical configuration access

Level 1 + Level 3 = practical configuration language with nested access.

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

function contains_ccl_syntax(value: string) -> boolean {
  // Check if value looks like CCL (contains "=")
  lines = split_lines(value)
  for line in lines {
    if trim(line).contains("=") {
      return true
    }
  }
  return false
}
```

#### Duplicate Key Handling
```pseudocode
function merge_into_result(result: CCL, key: string, value: any) {
  if key == "" {
    // Empty keys create lists
    if result[""] exists {
      result[""].append(value)
    } else {
      result[""] = [value]
    }
  } else if result[key] exists {
    // Merge duplicate keys
    result[key] = deep_merge(result[key], value)
  } else {
    result[key] = value
  }
}
```

### Level 4: Typed Access
**Goal:** Type-safe value extraction with smart inference  
**Test File:** `api-typed-access.json`  
**Function Tags:** `function:get-string`, `function:get-int`, `function:get-bool`, `function:get-float`, `function:get-list`  
**Use case:** Production systems with type safety requirements

Provides type-aware access to CCL values with automatic conversion and validation.

#### Key Filtering (Including Comments)

**Important**: CCL APIs provide general `filter()`, not comment-specific functions. `/=` is the standard comment marker, but filtering is flexible:

```pseudocode
// General-purpose key filtering function
function filter(entries: List<Entry>, predicate: (key: string) -> bool) -> List<Entry> {
  return entries.filter(entry -> predicate(entry.key))
}

// Standard comment filtering (/ = standard marker)
function get_config_entries(entries: List<Entry>) -> List<Entry> {
  return filter(entries, key -> !key.starts_with("/"))
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

- **[Implementation Levels](/implementation-levels)** - Detailed comparison of implementation levels
- **[API Reference](/api-reference)** - Recommended API patterns and conventions  
- **[Core Concepts](/core-concepts)** - Understanding CCL's foundation
- **[CCL FAQ](/ccl-faq)** - Common implementation questions and gotchas

The CCL specification and test suite provide everything needed to build a robust, compliant implementation in any programming language. Focus on correctness first, then optimize for your language's specific performance characteristics.