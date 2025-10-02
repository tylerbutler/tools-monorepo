---
title: Test Suite Guide
description: Using the CCL test suite for progressive implementation validation.
---

# Test Suite Guide

The [CCL Test Suite](https://github.com/ccl-test-data) provides 452 assertions across 167 tests for validating CCL implementations.

## Test Suite Stats

**Total Coverage**: 452 assertions across 167 tests in 10 JSON files

**Test Files**:
- `api-essential-parsing.json` - Basic parsing (Level 1)
- `api-comprehensive-parsing.json` - Edge cases
- `api-object-construction.json` - Nested objects (Level 3)
- `api-processing.json` - Entry composition (Level 2)
- `api-typed-access.json` - Type-safe access (Level 4)
- `api-comments.json` - Comment syntax
- `api-dotted-keys.json` - Dotted key expansion
- `api-errors.json` - Error handling
- `property-round-trip.json` - Round-trip validation
- `property-algebraic.json` - Algebraic properties

## Progressive Implementation Roadmap

### Phase 1: Core Parsing (Level 1)
**Tag**: `function:parse`

Implement basic key-value parsing:
- Split lines on first `=` character
- Handle whitespace (trim keys, preserve values)
- Support multiline values via indentation

**Tests**: `api-essential-parsing.json`

### Phase 2: Object Construction (Level 3)
**Tag**: `function:make-objects`

Build nested structures:
- Recursive parsing of values containing CCL
- Fixed-point algorithm termination
- Empty key handling for lists

**Tests**: `api-object-construction.json`

### Phase 3: Typed Access (Level 4)
**Tags**: `function:get-string`, `function:get-int`, `function:get-bool`

Add type-safe convenience:
- String extraction
- Integer/float parsing with validation
- Boolean conversion (true/false, yes/no, 1/0)

**Tests**: `api-typed-access.json`

### Phase 4: Optional Features
**Tags**: `feature:comments`, `feature:dotted-keys`

Add language features:
- Comment filtering (`/=` syntax)
- Dotted key expansion (`foo.bar.baz`)

**Tests**: `api-comments.json`, `api-dotted-keys.json`

### Phase 5: Production Hardening
**Tags**: `feature:error-handling`, `property:round-trip`

Ensure robustness:
- Comprehensive error handling
- Round-trip validation (parse → format → parse)
- Algebraic properties (associativity, commutativity)

**Tests**: `api-errors.json`, `property-*.json`

## Feature-Based Test Selection

Tests use structured tags for precise targeting:

**Function Tags**: `function:parse`, `function:make-objects`, `function:get-string`
**Feature Tags**: `feature:comments`, `feature:dotted-keys`
**Behavior Tags**: `behavior:crlf-normalize`, `behavior:boolean-strict`

Filter tests by capability to implement progressively.

## Using the Test Suite

Each test includes:
- `input`: CCL text to parse
- `expected`: Expected result
- `count`: Number of assertions (for validation)
- `tags`: Feature/function/behavior tags

See [CCL Test Suite](https://github.com/ccl-test-data) repository for complete test runner and JSON schema.
