---
title: Glossary
description: Technical terms and concepts used throughout the CCL documentation.
---

# CCL Glossary

## Core CCL Language Terms

### Categorical Configuration Language (CCL)
A minimal configuration language that uses simple key-value pairs with indentation-based nesting. Named "categorical" because it organizes configuration into categories through hierarchical structure.

### Entry
A single key-value pair in CCL before processing. For example, `database.host = localhost` creates an entry with key "database.host" and value "localhost".

### Entry List
The flat list of entries produced by parsing CCL text. All nested structure is represented as dot-separated keys at this level.

### CCL Object
The hierarchical data structure created from a flat entry list using the `build_hierarchy()` function. Allows nested access using dot notation.

### Empty Key
A key consisting of just `=` used to create lists in CCL. Multiple empty keys under the same parent create a list structure.
```ccl
ports =
  = 8080
  = 8081
```

### Dot Notation
A way to access nested values using dots to separate levels: `database.connection.host`. Works for both literal dot keys and nested objects.

### Flat Structure
CCL configuration using only literal dot keys: `database.host = localhost`. No indentation-based nesting.

### Nested Structure  
CCL configuration using indented sections to create hierarchy:
```ccl
database =
  host = localhost
  port = 5432
```

### Comment Key
A key used for documentation, typically starting with `/`, `#`, or `//`. Comment keys are regular entries that applications can filter out.

### Fixpoint Algorithm
The algorithm used by `build_hierarchy()` to convert flat entries into nested objects. Processes entries iteratively until a stable nested structure is reached.

## Gleam Implementation Terms

### CclValue
The unified value type returned by the `get()` function in the full CCL library:
- `CclString(String)` - Single string value
- `CclList(List(String))` - List of string values  
- `CclObject(CCL)` - Nested CCL object

### NodeType
Enum describing the type of data at a given path:
- `SingleValue` - Single terminal value
- `ListValue` - Multiple values (list structure)
- `ObjectValue` - Nested object with key-value pairs
- `Missing` - Path doesn't exist

### Smart Accessor
Enhanced accessor functions that provide better error handling and type detection:
- `get_int()` - Parse string values as integers
- `get_bool()` - Parse string values as booleans
- `get_float()` - Parse string values as floating-point numbers

### Type-Safe Parsing
The process of converting CCL string values into strongly-typed Gleam values with proper error handling and validation.

### Configuration Composition
The technique of combining multiple CCL sources (files, environment-specific configs) into a single configuration object.

### Error Aggregation
Collecting multiple configuration errors and reporting them together, rather than failing on the first error encountered.

## Configuration Concepts

### Environment-Specific Configuration
Configuration organized by deployment environment (development, staging, production), typically using prefixed keys or nested sections.

### Configuration Validation
The process of checking that all required configuration values are present and have valid types/formats.

### Configuration Defaults
Fallback values used when configuration entries are missing or invalid.

### Configuration Merging
Combining multiple configuration sources where later sources override earlier ones. CCL handles this naturally through duplicate key processing.

### Migration Pattern
A systematic approach to converting configuration from other formats (JSON, YAML, environment variables) to CCL.

## Parsing and Processing Terms

### Parse Error
An error that occurs during the text-to-entry parsing phase, usually due to invalid CCL syntax.

### Validation Error
An error that occurs when configuration values don't meet application requirements (wrong type, out of range, etc.).

### Path Resolution
The process of converting a dot-separated path like "database.host" into access to the appropriate nested value.

### Duplicate Key Handling
CCL's behavior when the same key appears multiple times. At the entry level (after parsing), duplicates are preserved. After object construction, duplicates are merged into objects or lists.

### Continuation Line
A line that continues the value from the previous line, indicated by indentation. Used for multiline values in CCL.

## Advanced Concepts

### Semigroup Properties
Mathematical properties that govern how CCL combines duplicate keys. Values form a semigroup under the merge operation.

### Monoid Identity
The mathematical identity element for CCL merging operations. Empty CCL objects serve as the identity.

### Hierarchical Flattening
The process of converting nested structures (like YAML) into flat dot-notation keys for CCL.

### Configuration Schema
The expected structure and types of configuration values, often enforced through Gleam type definitions.

### Round-Trip Compatibility
The ability to parse CCL, convert to internal representation, and serialize back to equivalent CCL text.

## Package-Specific Terms

### ccl_core
The minimal CCL parsing package with zero external dependencies. Provides basic parsing and hierarchy construction.

### ccl (full package)
The enhanced CCL library built on ccl_core with additional usability features, type-safe parsing, and better error handling.

### ccl_test_loader
Utility package for loading JSON-based test suites for cross-language CCL implementation testing.

### Zero Dependencies
A design goal of ccl_core to have no external dependencies beyond the Gleam standard library.

### Entry Point
The main function or API that applications use to start working with CCL. Usually parsing followed by object construction.

## Common Patterns

### Load-Parse-Validate Pattern
The common sequence of loading configuration text, parsing to entries, hierarchy construction, and validating required values.

### Environment Resolution
The pattern of selecting configuration based on environment variables or deployment context.

### Graceful Degradation
Handling missing or invalid configuration by falling back to sensible defaults rather than failing.

### Configuration Hot-Reloading
The ability to detect configuration changes and reload without restarting the application.

### Structured Error Reporting
Providing detailed, actionable error messages that help users fix configuration problems.

This glossary provides definitions for all technical terms used throughout the CCL documentation, helping both new users and implementers understand the concepts and terminology.