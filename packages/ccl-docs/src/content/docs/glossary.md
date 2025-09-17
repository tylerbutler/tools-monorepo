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


## Configuration Concepts

### Configuration Merging
Combining multiple configuration sources where later sources override earlier ones. CCL handles this naturally through duplicate key processing.


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




This glossary provides definitions for core CCL terms used throughout the documentation.