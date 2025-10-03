---
title: Parsing Algorithm
description: Language-agnostic algorithm for parsing CCL configuration files.
---

# CCL Parsing Algorithm

This document describes the core parsing algorithm for CCL implementations. The algorithm is presented in Rust-style pseudocode for clarity.

## Two-Stage Parsing

CCL parsing occurs in two distinct stages:

1. **Entry Parsing** - Convert raw text to flat key-value entries
2. **Object Construction** - Build hierarchical structure from entries

This separation allows implementations to choose their level of CCL support and enables composition of different processing steps.

## Stage 1: Entry Parsing

### Algorithm Overview

```rust
// Main entry parsing function - converts raw CCL text into flat key-value entries
// Returns error for empty input or malformed syntax
fn parse_entries(text: &str) -> Result<Vec<Entry>, ParseError> {
    // Reject empty or whitespace-only input as invalid CCL
    if text.trim().is_empty() {
        return Err(ParseError::new("Empty input"));
    }

    let mut entries = Vec::new();
    let lines: Vec<&str> = text.lines().collect();
    let mut current_index = 0;

    // Process each line, handling multiline values and keys
    while current_index < lines.len() {
        line = lines[current_index]
        
        if contains_equals(line):
            (key, value) = split_on_first_equals(line)
            key = trim_whitespace(key)
            value = process_initial_value(value)
            
            // Handle multiline values
            (value, lines_consumed) = process_multiline_value(
                lines, current_index, value
            )
            current_index += lines_consumed
            
            entries.append(Entry(key, value))
        else:
            // Handle multiline keys
            if is_potential_multiline_key(line, lines, current_index):
                (key, value, lines_consumed) = process_multiline_key(
                    lines, current_index
                )
                entries.append(Entry(key, value))
                current_index += lines_consumed
            else:
                return Error("Invalid line: " + line)
        
        current_index += 1
    
    return Ok(entries)
```

### Key Processing

```rust
// Helper functions for key processing
fn trim_whitespace(key: &str) -> &str {
    key.trim() // Remove leading and trailing whitespace
}

// Split line on first equals sign - everything after first = is the value
fn split_on_first_equals(line: &str) -> (&str, &str) {
    if let Some(equals_index) = line.find('=') {
        let key = &line[..equals_index];
        let value = &line[equals_index + 1..];
        (key, value)
    } else {
        (line, "") // No equals found
    }
}
```

### Value Processing

```rust
// Process the initial value part after the equals sign
fn process_initial_value(value: &str) -> String {
    // Remove leading spaces but preserve trailing whitespace
    value.trim_start().to_string()
}

// Handle multiline value continuation based on indentation
fn process_multiline_value(lines: &[&str], start_index: usize, initial_value: String) -> (String, usize) {
    let mut result = initial_value;
    let mut lines_consumed = 0;
    let base_indentation = calculate_base_indentation(lines, start_index);

    let mut current_index = start_index + 1;
    // Process continuation lines based on indentation
    while current_index < lines.len() {
        let line = lines[current_index];

        if line.trim().is_empty() {
            result.push('\n'); // Preserve empty lines in multiline values
            lines_consumed += 1;
        } else if is_continuation_line(line, base_indentation) {
            let continuation_content = extract_continuation_content(line, base_indentation);
            result.push('\n');
            result.push_str(&continuation_content);
            lines_consumed += 1;
        } else {
            break; // No more continuation lines
        }

        current_index += 1;
    }

    (result, lines_consumed)
```

### Indentation Handling

```rust
// Calculate the base indentation level for multiline processing
fn calculate_base_indentation(lines: &[&str], entry_index: usize) -> usize {
    let entry_line = lines[entry_index];
    count_leading_whitespace(entry_line)
}

// Check if a line continues the previous value based on indentation
fn is_continuation_line(line: &str, base_indentation: usize) -> bool {
    if line.trim().is_empty() {
        return true; // Empty lines are always continuation
    }

    let line_indentation = count_leading_whitespace(line);
    line_indentation > base_indentation // Must be more indented
}

// Count leading whitespace characters (spaces and tabs both = 1 unit)
fn count_leading_whitespace(line: &str) -> usize {
    let mut count = 0;
    for character in line.chars() {
        match character {
            ' ' | '\t' => count += 1, // Both spaces and tabs count as 1 unit
            _ => break, // Stop at first non-whitespace character
        }
    }
    count
}
```

### Multiline Key Support

```rust
// Check if a line without equals might be a multiline key
fn is_potential_multiline_key(line: &str, lines: &[&str], index: usize) -> bool {
    // Line must not contain equals and next line must start with equals
    if line.contains('=') {
        return false;
    }

    if index + 1 >= lines.len() {
        return false; // No next line available
    }

    let next_line = lines[index + 1];
    next_line.trim_start().starts_with('=') // Next line is the value
}

// Process multiline key where key is on one line, = value on next
fn process_multiline_key(lines: &[&str], start_index: usize) -> (String, String, usize) {
    let key_line = lines[start_index];
    let value_line = lines[start_index + 1];

    let key = key_line.trim().to_string(); // Clean the key
    // Skip the leading "=" and process the value
    let value = process_initial_value(&value_line[1..]);

    // Check for multiline value continuation
    let (final_value, additional_lines) = process_multiline_value(
        lines, start_index + 1, value
    );

    let total_lines_consumed = 1 + additional_lines;
    (key, final_value, total_lines_consumed)
}
```

## Stage 2: Object Construction

### Algorithm Overview

```rust
// Convert flat entries into hierarchical CCL object structure
fn build_hierarchy(entries: Vec<Entry>) -> CCLObject {
    let mut result = HashMap::new();

    // Process each entry, handling dotted keys and direct values
    for entry in entries {
        if is_dotted_key(&entry.key) {
            set_nested_value_by_path(&mut result, &entry.key, &entry.value);
        } else {
            set_direct_value(&mut result, &entry.key, &entry.value);
        }
    }

    convert_to_hierarchical_structure(result)
}
```

### Dotted Key Processing

```rust
// Check if a key contains dots (dotted key notation)
fn is_dotted_key(key: &str) -> bool {
    key.contains('.') // Simple dot detection
}

// Set a value in nested structure using dot-separated path
fn set_nested_value_by_path(result: &mut HashMap<String, CCLValue>, dotted_key: &str, value: &str) {
    let path_segments: Vec<&str> = dotted_key.split('.').collect();
    let mut current_level = result;

    // Navigate to the target location, creating intermediate maps as needed
    for i in 0..path_segments.len() - 1 {
        let segment = path_segments[i];
        if !current_level.contains_key(segment) {
            current_level.insert(segment.to_string(), CCLValue::Object(HashMap::new()));
        }
        // Navigate deeper into the nested structure
        if let CCLValue::Object(ref mut nested) = current_level.get_mut(segment).unwrap() {
            current_level = nested;
        }
    }

    // Set the final value
    let final_segment = path_segments[path_segments.len() - 1];
    current_level.insert(final_segment.to_string(), CCLValue::String(value.to_string()));
}
```

### Hierarchical Structure Creation

```rust
// Convert processed flat map into final hierarchical structure
fn convert_to_hierarchical_structure(flat_map: HashMap<String, CCLValue>) -> CCLObject {
    let mut result = HashMap::new();

    // Process each entry to determine its role in the hierarchy
    for (key, value) in flat_map {
        if key.is_empty() {
            // Handle list items (empty keys)
            add_to_list(&mut result, value);
        } else if is_empty_value(&value) && has_nested_entries(&flat_map, &key) {
            // Handle sections (empty values with nested content)
            result.insert(key, create_nested_object(&flat_map, &key));
        } else {
            // Handle regular key-value pairs
            result.insert(key, value);
        }
    }

    result
}
```

## Error Handling

### Common Error Conditions

```rust
// Validate input before parsing to catch common issues early
fn validate_input(text: &str) -> Result<(), ParseError> {
    if text.is_empty() {
        return Err(ParseError::new("Empty input"));
    }

    if text.trim().is_empty() {
        return Err(ParseError::new("Input contains only whitespace"));
    }

    Ok(()) // Input is valid
}

// Create structured parse error with location information
fn create_parse_error(message: &str, line_number: usize, column: usize) -> ParseError {
    ParseError {
        message: message.to_string(),
        line: Some(line_number),
        column: Some(column),
    }
}
```

### Line-by-Line Error Reporting

```rust
// Parse with comprehensive error context for debugging
fn parse_with_error_context(text: &str) -> Result<Vec<Entry>, ParseError> {
    let lines: Vec<(usize, &str)> = text.lines().enumerate().collect();
    let mut entries = Vec::new();

    // Process each line with error location tracking
    for (line_number, line_content) in lines {
        match process_line(line_content) {
            Ok(entry) => entries.push(entry),
            Err(error) => {
                return Err(create_parse_error(
                    &error.message,
                    line_number + 1, // Convert to 1-based line numbers
                    calculate_column(line_content, error.position)
                ));
            }
        }
    }

    Ok(entries)
}
```

## Implementation Guidelines


### Edge Case Handling

1. **Mixed Indentation**: Detect and warn about mixed tabs/spaces
2. **Unicode Support**: Handle Unicode characters in keys and values
3. **Large Files**: Consider streaming for very large configuration files
4. **Malformed Input**: Provide helpful error messages with context

### Testing Strategy

1. **Unit Tests**: Test each function independently
2. **Integration Tests**: Test full parsing pipeline
3. **Edge Cases**: Test boundary conditions and error cases
4. **Performance Tests**: Benchmark with realistic configuration files

## Data Structures

### Entry Type

```rust
// Basic key-value entry from parsing stage
#[derive(Debug, Clone)]
struct Entry {
    key: String,
    value: String,
}
```

### Parse Error Type

```rust
// Comprehensive error information for debugging
#[derive(Debug)]
struct ParseError {
    message: String,
    line: Option<usize>,    // 1-based line number
    column: Option<usize>,  // 1-based column number
    context: Option<String>, // Additional context for debugging
}
```

### CCL Value Types

```rust
// Recursive value types for hierarchical configuration
#[derive(Debug, Clone)]
enum CCLValue {
    String(String),                           // Terminal string value
    Object(HashMap<String, CCLValue>),        // Nested object
    List(Vec<CCLValue>),                      // Array of values
}

type CCLObject = HashMap<String, CCLValue>;
```

This algorithm forms the foundation for any CCL implementation and can be adapted to the idioms and patterns of specific programming languages.