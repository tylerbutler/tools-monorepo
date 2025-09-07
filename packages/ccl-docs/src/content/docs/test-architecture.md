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
**Files**: `tests/core/essential-parsing.json` (18 tests)  
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
**Files**: `tests/core/comprehensive-parsing.json` (30 tests)
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
**Files**: `tests/core/object-construction.json` (8 tests)  
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
**Files**: `tests/features/dotted-keys.json` (18 tests)  
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
**Files**: `tests/features/comments.json` (3 tests)  
**API:** `filter(entries)`  
**Purpose:** Remove documentation keys from configuration

#### Functionality  
- Filter keys starting with `/` (comment syntax)
- Configurable comment prefixes
- Preserve structure while removing documentation

### Entry Processing
**Files**: `tests/features/processing.json` (21 tests)
**API:** `compose_entries()`, advanced processing
**Purpose:** Advanced composition and merging capabilities

#### Functionality
- Duplicate key handling and composition  
- Entry list merging with algebraic properties
- Complex composition scenarios
- Associative and commutative operations

### Typed Access
**Files**: `tests/features/typed-access.json` (17 tests)  
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
**Files**: `tests/integration/errors.json` (5 tests)  
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