---
title: Test Architecture
description: CCL implementations use a feature-based test organization that provides clear implementation milestones while allowing developers to choose their level of CCL support.
---

# CCL Test Suite Architecture

## Architecture Overview

```
Core Functionality     ← Essential for any CCL implementation
├── Essential Parsing     (18 tests) - Start here
├── Comprehensive Parsing (30 tests) - Production ready  
└── Object Construction   (8 tests) - Hierarchical access

Optional Features      ← Choose based on your needs
├── Dotted Keys          (18 tests) - Dual access patterns
├── Comments             (3 tests) - Documentation support
├── Processing           (21 tests) - Advanced composition  
└── Typed Access         (17 tests) - Type-safe APIs

Integration           ← Validation & edge cases
└── Error Handling       (5 tests) - Robust error reporting
```

Each category has specific APIs, test suites, and implementation requirements.

## Core Functionality (Required)

### Essential Parsing
**API:** `parse(text) → Result<Entry[], ParseError>`  
**Status:** Required for all CCL implementations

#### Functionality
- Basic key-value parsing with `=` delimiter
- Whitespace handling and normalization  
- Multiline values through indented continuation lines
- Unicode support and line ending normalization
- Empty keys/values and equals-in-values handling
- Core error detection and reporting

#### Test Coverage
- **Focus areas:** Basic parsing, whitespace, multiline values, unicode
- **Essential tests:** 18 core functionality tests for rapid prototyping
- Covers 80% of real-world CCL usage scenarios

#### Example Implementation
```pseudocode
function parse(text) {
  entries = []
  lines = split_lines(text)
  
  for each line {
    if contains("=") {
      key = extract_key(line)
      value = extract_value(line)
      
      // Handle continuation lines
      while next_line_indented() {
        value += "\n" + continuation_content()
      }
      
      entries.append(Entry(key, value))
    }
  }
  
  return entries
}
```

### Comprehensive Parsing  
**Purpose:** Production-ready validation with comprehensive edge cases
**Status:** Recommended for production systems

#### Functionality
- Whitespace variations (tabs, spaces, mixed indentation)
- Line ending handling (Unix, Windows, Mac)
- Edge cases (empty keys/values, multiple equals, quotes)
- Stress testing with realistic configuration examples
- Unicode edge cases and normalization

#### Test Coverage
- **Edge cases:** Comprehensive whitespace and formatting variations
- **Production scenarios:** Complex real-world configuration patterns
- **Robustness:** Handles malformed input gracefully

### Object Construction
**API:** `make_objects(entries) → CCL`  
**Status:** Required for hierarchical access

#### Functionality
- Recursive parsing of nested values using fixed-point algorithm
- Duplicate key merging in object construction
- Empty key handling for list-style data  
- Complex nested configuration support

#### Fixed-Point Algorithm
```pseudocode
function make_objects(entries) {
  objects = {}
  
  for each entry in entries {
    if entry.value contains CCL syntax {
      // Recursively parse nested content
      nested_entries = parse(entry.value)
      objects[entry.key] = make_objects(nested_entries)
    } else {
      objects[entry.key] = entry.value
    }
  }
  
  return merge_duplicate_keys(objects)
}
```

## Optional Features (Choose Based on Needs)

### Dotted Key Expansion
**Purpose:** Enable dual access patterns for convenience
**Status:** Recommended for user-friendly APIs

#### Functionality
- Expand `database.host = localhost` to nested structures
- Support deep nesting (3+ levels)
- Handle mixed dotted and nested syntax
- Resolve conflicts between access patterns

#### Benefits
- Users can write `database.host = localhost` 
- APIs support both `get(obj, "database.host")` and `get(obj, "database", "host")`
- Flexible configuration authoring

### Comment Filtering
**API:** `filter(entries)`  
**Purpose:** Remove documentation keys from configuration

#### Functionality  
- Filter keys starting with `/` (comment syntax)
- Configurable comment prefixes
- Preserve structure while removing documentation

### Entry Processing
**API:** `compose_entries()`, advanced processing
**Purpose:** Advanced composition and merging capabilities

#### Functionality
- Duplicate key handling and composition  
- Entry list merging with algebraic properties
- Complex composition scenarios
- Associative and commutative operations

### Typed Access
**API:** `get_string()`, `get_int()`, `get_bool()`, etc.  
**Purpose:** Type-safe value extraction with validation

#### Functionality
- Smart type inference (integers, floats, booleans)
- Configurable parsing options and validation
- Language-specific convenience functions  
- Dual access pattern support (dotted + hierarchical)
- Type safety and error handling

#### Example Implementation
```pseudocode
function get_int(ccl_obj, ...path) {
  value = get_raw_value(ccl_obj, ...path)
  
  if value matches integer_pattern {
    return parse_int(value)
  } else {
    return TypeError("Expected integer at " + path)
  }
}

function get_bool(ccl_obj, ...path) {
  value = get_raw_value(ccl_obj, ...path).toLowerCase()
  
  if value in ["true", "yes", "on", "1"] {
    return true
  } else if value in ["false", "no", "off", "0"] {
    return false  
  } else {
    return TypeError("Expected boolean at " + path)
  }
}
```

## Integration & Validation

### Error Handling
**Purpose:** Malformed input detection across all functionality
**Status:** Recommended for robust implementations

#### Error Categories
1. **Parse Errors:** Malformed CCL syntax
2. **Type Errors:** Invalid type conversion  
3. **Path Errors:** Nonexistent configuration keys
4. **Validation Errors:** Failed constraint checking

## Implementation Strategy

### Progressive Implementation
1. **Start with Core**: Essential parsing (18 tests) → Object construction (8 tests)
2. **Add Production Readiness**: Comprehensive parsing (30 tests)
3. **Choose Features**: Select from features/ based on your use case
4. **Validate**: Error handling for robustness

### Implementation Priorities

#### Minimal CCL (Essential - 26 tests)
- `core/essential-parsing.json` (18 tests)
- `core/object-construction.json` (8 tests)
- Basic CCL support for simple configurations

#### Standard CCL (Recommended - 56 tests)  
- All Core functionality (56 tests)
- `features/dotted-keys.json` (18 tests)
- `integration/errors.json` (5 tests)
- Production-ready with convenient access patterns

#### Full CCL (Complete - 135 tests)
- All tests across all categories
- Maximum feature support and robustness

### Test-Driven Development
```bash
# Core functionality
npm run validate:core                    # Essential tests
cd tests && validate core/*.json         # All core tests

# Feature selection
cd tests && validate features/dotted-keys.json  # Dotted key support
cd tests && validate features/typed-access.json # Type-safe APIs

# Full validation  
npm test                                 # All tests
```

### API Design Patterns

**Consistent Error Handling:**
```pseudocode
Result<T, Error> pattern for all fallible operations
- Ok(value) for successful operations
- Error(message) for failures with descriptive messages
```

**Reusable Implementation:**
```pseudocode
// Core navigation logic shared across all getters
parse_path(...args) → segments
navigate_path(obj, segments) → value
get_raw_value(obj, ...path) → string

// All typed getters reuse the same navigation
get_int(obj, ...path) → int
get_bool(obj, ...path) → bool
get_string(obj, ...path) → string
```

## Architecture Benefits

1. **Flexible Implementation**: Choose features based on actual needs
2. **Clear Progression**: Start simple, add features incrementally  
3. **Implementation Guidance**: Test counts show relative complexity
4. **Language Agnostic**: Architecture works across programming languages
5. **Comprehensive Coverage**: 135 tests cover all CCL functionality
6. **Maintainable**: Feature-based organization scales with new features

## Implementation Examples

### Minimal Implementation (Essential + Objects)
```pseudocode
// Basic CCL parser with hierarchy
entries = parse(ccl_text)              // 18 essential parsing tests
objects = make_objects(entries)        // 8 object construction tests
value = get_string(objects, "database", "host")
```

### Standard Implementation (Core + Dotted Keys)
```pseudocode  
// Convenient CCL parser with dual access
entries = parse(ccl_text)              // All core tests (56)
objects = make_objects(entries)
host = get_string(objects, "database.host")      // Dotted access
port = get_int(objects, "database", "port")      // Hierarchical access
```

### Production Implementation (Full Features)
```pseudocode
// Robust configuration loading
try {
  entries = parse(read_file("config.ccl"))      // Comprehensive parsing
  filtered = filter(entries)                    // Comment filtering  
  config = make_objects(filtered)               // Object construction
  
  validate_required_keys(config)
  return load_typed_config(config)              // Type-safe access
} catch (error) {
  log_error("Configuration failed:", error)     // Error handling
  return default_config()
}
```

The feature-based architecture provides a systematic approach to building CCL implementations while maintaining simplicity and flexibility for different use cases and requirements.

## Test Suite Format

### JSON Test Structure

All CCL tests are stored in JSON files for language-agnostic implementation. Each test file contains an array of test cases with the following structure:

```json
{
  "name": "descriptive_test_name",
  "input": "ccl input text",
  "expected": [
    {"key": "parsed_key", "value": "parsed_value"}
  ],
  "meta": {
    "tags": ["category", "feature"],
    "level": 1
  }
}
```

### Test File Organization

The test suite is organized into specific JSON files:

- **`ccl-entry-parsing.json`** - Core parsing tests (18 tests)
- **`ccl-entry-processing.json`** - Comment filtering and composition (10 tests)
- **`ccl-object-construction.json`** - Nested object building (8 tests)
- **`ccl-typed-parsing-examples.json`** - Type-safe parsing (12 tests)
- **`ccl-pretty-printer.json`** - Formatting and round-trip tests (15 tests)
- **`ccl-errors.json`** - Error handling validation (5 tests)

### Special Test Types

#### Pretty Printer Tests

Pretty printer tests use a special format to test formatting properties:

```json
{
  "name": "test_name",
  "property": "round_trip|canonical_format|deterministic", 
  "input": "ccl input text",
  "expected_canonical": "expected pretty printed output",
  "meta": {
    "tags": ["pretty-print"],
    "level": "pretty-print"
  }
}
```

**Property Types:**
- `round_trip`: Test that `parse(pretty_print(parse(input))) == parse(input)`
- `canonical_format`: Test that `pretty_print(parse(input)) == expected_canonical`
- `deterministic`: Test that multiple calls produce identical output

#### Error Tests

Error tests verify that invalid input is properly rejected:

```json
{
  "name": "invalid_syntax",
  "input": "invalid input without equals",
  "expected_error": true,
  "error_message": "expected equals sign",
  "meta": {
    "tags": ["error", "syntax"],
    "level": 1
  }
}
```

### Test Metadata

Each test includes metadata for categorization:

- **`level`**: Which CCL implementation level the test targets (1-4, or "pretty-print")
- **`tags`**: Categories for filtering tests (e.g., ["basic"], ["multiline"], ["edge-case"])

### Implementation Guidelines

When implementing CCL parsers:

1. **Load JSON test files** into your testing framework
2. **Filter by level** to test only the features you implement
3. **Use tags** to focus on specific functionality during development
4. **Validate all expected fields** in your test results
5. **Report test coverage** by level and feature category

### Cross-Language Compatibility

The JSON format ensures tests can be used across different programming languages:

- Test data is language-agnostic
- Expected results use simple data structures
- No language-specific features in test definitions
- Enables validation of equivalent behavior across implementations