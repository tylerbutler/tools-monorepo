---
title: AI Assistant Quickstart
description: Quick reference for AI assistants helping users implement CCL parsers and test runners
---

:::note[For AI Agents]
This page is a quick reference for AI agents. For a complete implementation guide, see [AI Implementation Guide](/ai-implementation-guide). Humans looking for prompts should see [CCL Prompts](/ai-prompts).
:::

# CCL Quick Reference for AI Assistants

> Single-page orientation for AI assistants. For details, follow links to specific documentation pages.

## Quick Facts

- **CCL** = Categorical Configuration Language
- **NOT like YAML/JSON** - uses recursive fixed-point parsing
- **All identifiers use snake_case** (never hyphens)
- **Core requirement**: `parse` + `build_hierarchy` functions only
- **Everything else is optional** library convenience

## Standard Terminology

Use these exact terms when discussing CCL:

| Category | Terms |
|----------|-------|
| **Core Functions** | `parse`, `build_hierarchy` |
| **Typed Access** | `get_string`, `get_int`, `get_bool`, `get_float`, `get_list` |
| **Processing** | `filter`, `compose` |
| **Formatting** | `print`, `canonical_format` |
| **Features** | `comments`, `empty_keys`, `multiline`, `unicode`, `whitespace` |
| **Experimental** | `experimental_dotted_keys` (not standard) |

### Behaviors (Implementation Choices)

Behaviors are not inherently mutually exclusive. Tests use a `conflicts` field to specify incompatible combinations.

| Behavior Group | Options | Description |
|----------------|---------|-------------|
| Line Endings | `crlf_preserve_literal` vs `crlf_normalize_to_lf` | CRLF handling: preserve `\r` chars vs normalize to LF |
| Boolean Parsing | `boolean_lenient` vs `boolean_strict` | Accept "yes"/"no" vs only "true"/"false" |
| Tab Handling | `tabs_as_content` vs `tabs_as_whitespace` | Preserve tabs literally vs treat as whitespace |
| Indentation | `indent_spaces` vs `indent_tabs` | Output formatting style |
| List Access | `list_coercion_enabled` vs `list_coercion_disabled` | List access coercion behavior |
| Array Ordering | `array_order_insertion` vs `array_order_lexicographic` | Preserve insertion order vs sort lexicographically |

### Variants

- `proposed_behavior` - Proposed specification behavior
- `reference_compliant` - OCaml reference implementation behavior

## Key Concept: Recursive Fixed-Point Parsing

CCL is fundamentally different from YAML/JSON. Understanding this is critical:

```ccl
database =
  host = localhost
  port = 5432
```

1. Parse → `Entry("database", "\n  host = localhost\n  port = 5432")`
2. Value contains `=` → parse recursively
3. Result → `{database: {host: "localhost", port: "5432"}}`
4. Fixed point → "localhost" and "5432" have no `=` → done

📖 **Full details**: [Parsing Algorithm](/parsing-algorithm)

## Documentation Map

### For Implementation

| Page | Use When |
|------|----------|
| [Implementing CCL](/implementing-ccl) | Starting a new implementation, choosing data structures |
| [Parsing Algorithm](/parsing-algorithm) | Understanding the core recursive algorithm |
| [Syntax Reference](/syntax-reference) | Looking up syntax rules and edge cases |

### For Library Features

| Page | Use When |
|------|----------|
| [Library Features](/library-features) | Adding typed access, entry processing, or formatting |
| [Library Features: Formatting](/library-features#formatting-functions) | Understanding `print` vs `canonical_format` |

### For Testing

| Page | Use When |
|------|----------|
| [Test Suite Guide](/test-suite-guide) | Setting up test filtering, understanding test format |

**Test Suite Repository**: https://github.com/tylerbutler/ccl-test-data

## Common AI Assistant Pitfalls

### ❌ Don't Use Hyphens
- Wrong: `build-hierarchy`, `get-string`, `dotted-keys`
- Right: `build_hierarchy`, `get_string`, `experimental_dotted_keys`

### ❌ Don't Confuse Test Formats
- `source_tests/` → For test suite maintainers
- `generated_tests/` → **For implementers (use this one)**

### ❌ Don't Include Dotted Keys in Standard Progression
- Dotted keys are **experimental**
- Not part of standard CCL implementation path

### ❌ Don't Parse Like YAML/JSON
- CCL uses recursive fixed-point parsing
- Fundamentally different algorithm
- See [Parsing Algorithm](/parsing-algorithm)

### ❌ Don't Confuse `print` and `canonical_format`
- `print` → Structure-preserving: `print(parse(x)) == x`
- `canonical_format` → Semantic-preserving: transforms to model representation
- See [Library Features: Formatting](/library-features#formatting-functions)

## Quick Reference Card

```
TERMINOLOGY:     Use snake_case everywhere
CORE:            parse, build_hierarchy (required)
OPTIONAL:        get_*, filter, compose, print, canonical_format
FEATURES:        comments, empty_keys, multiline, unicode, whitespace
EXPERIMENTAL:    experimental_dotted_keys (NOT standard)
TEST FORMAT:     Use generated_tests/ directory (flat format)
ALGORITHM:       Recursive fixed-point parsing (NOT like YAML/JSON)
```
