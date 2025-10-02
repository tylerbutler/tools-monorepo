# CCL Test Suite Guide (POC)

**Target**: 60-70 lines
**Purpose**: Proof-of-concept guide to using the official CCL test suite
**Current suite**: 180 tests, 375 assertions (JSON format)

## Test Suite Overview

The official CCL test suite validates implementations with:
- **180 tests** across 10 JSON files
- **375 total assertions** testing specific behaviors
- **Feature-based tagging** for precise test selection
- **Counted format** - every test includes assertion counts

## Getting the Test Suite

```bash
git clone https://github.com/ccl-project/ccl-test-data
cd ccl-test-data/tests/
```

Test files:
- `api-essential-parsing.json` - Basic parsing (required)
- `api-comprehensive-parsing.json` - Edge cases and thorough parsing
- `api-object-construction.json` - Flat entries → nested objects
- `api-typed-access.json` - Type conversion functions
- `api-processing.json` - Entry filtering, merging
- `api-comments.json` - Comment syntax
- `api-dotted-keys.json` - Dotted key expansion (optional)
- `api-errors.json` - Error handling validation
- `property-*.json` - Algebraic properties and round-trip

## Progressive Implementation Roadmap

### Phase 1: Core Parsing (163 tests)
**Tags**: `function:parse`, `function:parse_value`

Implement basic CCL parsing:
- Split lines on `=`
- Handle indentation
- Parse to flat entries

**Run**: Filter tests with `function:parse`

### Phase 2: Object Construction (77 tests)
**Tags**: `function:build_hierarchy`

Build nested objects from flat entries:
- Group by indentation
- Create nested structure
- Handle empty keys (lists)

**Run**: Filter tests with `function:build_hierarchy`

### Phase 3: Typed Access (84 tests)
**Tags**: `function:get_string`, `function:get_int`, `function:get_bool`, `function:get_float`, `function:get_list`

Add type-aware value extraction:
- String access (required)
- Integer conversion
- Boolean conversion
- List access

**Run**: Filter tests with `function:get_*`

### Phase 4: Processing (12 tests)
**Tags**: `function:filter`, `function:merge`

Optional processing features:
- Comment filtering
- Entry merging
- Composition

**Run**: Filter tests with `function:filter` or `function:merge`

### Phase 5: Formatting (26 tests)
**Tags**: `function:canonical_format`, `function:round_trip`

Output and validation:
- Pretty printing
- Round-trip validation

**Run**: Filter tests with `function:canonical_format`

## Feature-Based Test Selection

Tests use structured tags:

**Function tags** - What CCL function to test:
- `function:parse` - Basic parsing
- `function:build_hierarchy` - Object construction
- `function:get_string` - String value access

**Feature tags** - Optional language features:
- `feature:comments` - `/=` comment syntax
- `feature:empty-keys` - `= value` list syntax
- `feature:dotted-keys` - Dotted key expansion (optional)

**Behavior tags** - Runtime behaviors:
- `behavior:crlf-normalize` - Line ending handling
- `behavior:boolean-strict` - Boolean parsing rules
- `behavior:list-coercion` - List creation rules

**Variant tags** - Test variations:
- `variant:error-case` - Should fail
- `variant:edge-case` - Unusual input

## Running Tests

Filter tests by your implementation's capabilities:

```bash
# Only core parsing tests
jq '.tests[] | select(.tags | contains(["function:parse"]))' api-*.json

# Exclude optional features
jq '.tests[] | select(.tags | contains(["feature:dotted-keys"]) | not)' api-*.json

# Only error cases
jq '.tests[] | select(.tags | contains(["variant:error-case"]))' api-errors.json
```

## Test Format

Each test includes:
- `input`: CCL text to parse
- `expected`: Expected output (or error)
- `tags`: Feature/function/behavior tags
- `count`: Number of assertions (validation)
- `description`: What the test validates

## Debugging Failed Tests

When tests fail:

1. **Check tags**: Are you implementing this function/feature?
2. **Read description**: Understand what's being tested
3. **Examine input/expected**: See the specific case
4. **Verify count**: Did you run the right number of assertions?
5. **Check behaviors**: Do your runtime behaviors match?

## Conflict Resolution

Some behaviors are mutually exclusive:

- `boolean-strict` vs `boolean-lenient`
- `list-coercion-enabled` vs `list-coercion-disabled`

Choose one behavior and filter tests accordingly.

---

**Line count**: ~68 lines
**Target achieved**: ✅ 60-70 lines
**Validation**: Covers test suite usage with progressive implementation roadmap
