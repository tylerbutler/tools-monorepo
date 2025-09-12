---
title: Parsing Algorithm
description: Language-agnostic algorithm for parsing CCL configuration files.
---

# CCL Parsing Algorithm

This document describes the core parsing algorithm for CCL implementations. The algorithm is presented in pseudocode to be language-agnostic.

## Two-Stage Parsing

CCL parsing occurs in two distinct stages:

1. **Entry Parsing** - Convert raw text to flat key-value entries
2. **Object Construction** - Build hierarchical structure from entries

This separation allows implementations to choose their level of CCL support and enables composition of different processing steps.

## Stage 1: Entry Parsing

### Algorithm Overview

```pseudocode
function parse_entries(text: string) -> Result<List<Entry>, ParseError>:
    if is_empty_or_whitespace_only(text):
        return Error("Empty input")
    
    entries = []
    lines = split_into_lines(text)
    current_index = 0
    
    while current_index < length(lines):
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

```pseudocode
function trim_whitespace(key: string) -> string:
    return remove_leading_and_trailing_whitespace(key)

function split_on_first_equals(line: string) -> (string, string):
    equals_index = find_first_occurrence(line, "=")
    key = substring(line, 0, equals_index)
    value = substring(line, equals_index + 1, end)
    return (key, value)
```

### Value Processing

```pseudocode
function process_initial_value(value: string) -> string:
    // Remove leading spaces but preserve trailing whitespace
    return remove_leading_spaces(value)

function process_multiline_value(lines: List<string>, start_index: int, initial_value: string) -> (string, int):
    result = initial_value
    lines_consumed = 0
    base_indentation = calculate_base_indentation(lines, start_index)
    
    current_index = start_index + 1
    while current_index < length(lines):
        line = lines[current_index]
        
        if is_empty_line(line):
            result += "\n"
            lines_consumed += 1
        else if is_continuation_line(line, base_indentation):
            continuation_content = extract_continuation_content(line, base_indentation)
            result += "\n" + continuation_content
            lines_consumed += 1
        else:
            break
        
        current_index += 1
    
    return (result, lines_consumed)
```

### Indentation Handling

```pseudocode
function calculate_base_indentation(lines: List<string>, entry_index: int) -> int:
    entry_line = lines[entry_index]
    leading_whitespace = count_leading_whitespace(entry_line)
    return leading_whitespace

function is_continuation_line(line: string, base_indentation: int) -> bool:
    if is_empty_line(line):
        return true
    
    line_indentation = count_leading_whitespace(line)
    return line_indentation > base_indentation

function count_leading_whitespace(line: string) -> int:
    count = 0
    for character in line:
        if character == ' ':
            count += 1
        else if character == '\t':
            count += 1  // Tabs count as 1 indentation unit
        else:
            break
    return count
```

### Multiline Key Support

```pseudocode
function is_potential_multiline_key(line: string, lines: List<string>, index: int) -> bool:
    if contains_equals(line):
        return false
    
    if index + 1 >= length(lines):
        return false
    
    next_line = lines[index + 1]
    return starts_with_equals(next_line)

function process_multiline_key(lines: List<string>, start_index: int) -> (string, string, int):
    key_line = lines[start_index]
    value_line = lines[start_index + 1]
    
    key = trim_whitespace(key_line)
    value = process_initial_value(substring(value_line, 1)) // Skip the leading "="
    
    // Process potential multiline value continuation
    (final_value, additional_lines) = process_multiline_value(
        lines, start_index + 1, value
    )
    
    total_lines_consumed = 1 + additional_lines
    return (key, final_value, total_lines_consumed)
```

## Stage 2: Object Construction

### Algorithm Overview

```pseudocode
function build_hierarchy(entries: List<Entry>) -> CCL:
    result = empty_map()
    
    for entry in entries:
        if is_dotted_key(entry.key):
            set_nested_value_by_path(result, entry.key, entry.value)
        else:
            set_direct_value(result, entry.key, entry.value)
    
    return convert_to_hierarchical_structure(result)
```

### Dotted Key Processing

```pseudocode
function is_dotted_key(key: string) -> bool:
    return contains_character(key, ".")

function set_nested_value_by_path(result: Map, dotted_key: string, value: string):
    path_segments = split_by_character(dotted_key, ".")
    current_level = result
    
    for i in range(0, length(path_segments) - 1):
        segment = path_segments[i]
        if not exists(current_level, segment):
            current_level[segment] = empty_map()
        current_level = current_level[segment]
    
    final_segment = path_segments[length(path_segments) - 1]
    current_level[final_segment] = value
```

### Hierarchical Structure Creation

```pseudocode
function convert_to_hierarchical_structure(flat_map: Map) -> CCL:
    result = empty_map()
    
    for (key, value) in flat_map:
        if is_empty_key(key):
            // Handle list items
            add_to_list(result, value)
        else if is_empty_value(value) and has_nested_entries(flat_map, key):
            // Handle sections
            result[key] = create_nested_object(flat_map, key)
        else:
            // Handle regular values
            result[key] = value
    
    return result
```

## Error Handling

### Common Error Conditions

```pseudocode
function validate_input(text: string) -> Result<void, ParseError>:
    if length(text) == 0:
        return Error("Empty input")
    
    if is_only_whitespace(text):
        return Error("Input contains only whitespace")
    
    return Ok()

function create_parse_error(message: string, line_number: int, column: int) -> ParseError:
    return ParseError {
        message: message,
        line: line_number,
        column: column
    }
```

### Line-by-Line Error Reporting

```pseudocode
function parse_with_error_context(text: string) -> Result<List<Entry>, ParseError>:
    lines = split_into_lines_with_numbers(text)
    
    for (line_number, line_content) in lines:
        try:
            // Process line
        catch error:
            return Error(create_parse_error(
                error.message, 
                line_number, 
                calculate_column(line_content, error.position)
            ))
    
    return Ok(entries)
```

## Implementation Guidelines

### Performance Considerations

1. **Single Pass**: Process input in a single pass when possible
2. **Lazy Evaluation**: Consider lazy evaluation for large files
3. **Memory Efficiency**: Avoid storing unnecessary intermediate representations
4. **Early Termination**: Stop processing on first error in strict mode

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

```pseudocode
Entry {
    key: string
    value: string
}
```

### Parse Error Type

```pseudocode
ParseError {
    message: string
    line: optional<int>
    column: optional<int>
    context: optional<string>
}
```

### CCL Value Types

```pseudocode
CCLValue = 
    | String(string)
    | Object(Map<string, CCLValue>)
    | List(List<CCLValue>)
```

This algorithm forms the foundation for any CCL implementation and can be adapted to the idioms and patterns of specific programming languages.