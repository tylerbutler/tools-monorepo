---
title: CCL Prompts for AI Agents
description: Ready-to-use prompts for AI agents building CCL implementations.
---

:::note[For Humans]
This page is for you to copy prompts and give them to your AI agent. The AI should read the [AI Implementation Guide](/ai-implementation-guide) instead.
:::

# CCL Prompts for AI Agents

Copy-paste these prompts to guide AI agents building CCL implementations.

## How to Use

1. **Choose a prompt** that matches your goal
2. **Replace `[language]`** with your target language (Rust, Python, etc.)
3. **Paste into your AI agent** (Claude, ChatGPT, Copilot, etc.)
4. **The AI will read the docs** and follow the specification

---

## Full Implementation

### Basic Implementation

```
Build a CCL parser in [language].

Read https://ccl.tylerbutler.com/ai-implementation-guide/ for the complete
specification. Start with parse and build_hierarchy, then add typed access.

Use tests from https://github.com/tylerbutler/ccl-test-data to validate.
```

### With Specific Behaviors

```
Build a CCL parser in [language] with these behaviors:
- crlf_normalize_to_lf (normalize line endings)
- boolean_strict (only "true" and "false")
- list_coercion_disabled (require explicit list syntax)

Read https://ccl.tylerbutler.com/ai-implementation-guide/ for the specification.
See https://ccl.tylerbutler.com/behavior-reference/ for behavior details.
```

### Minimal Core Only

```
Build a minimal CCL parser in [language] with only the required functions:
- parse (text to entries)
- build_hierarchy (entries to nested object)

Skip typed access and formatting for now.

Read https://ccl.tylerbutler.com/ai-implementation-guide/#core-functions-required
```

---

## Feature-Specific

### Add Typed Access

```
I have a CCL parser with parse and build_hierarchy working.

Add typed access functions:
- get_string
- get_int
- get_bool
- get_float
- get_list

Follow https://ccl.tylerbutler.com/ai-implementation-guide/#typed-access-functions-optional
Use https://ccl.tylerbutler.com/library-features/ for implementation details.
```

### Add Single Function

```
Add the get_list function to my CCL implementation following the spec at
https://ccl.tylerbutler.com/ai-implementation-guide/#get_list

Use list_coercion_disabled behavior (error if value is not actually a list).
```

### Add Formatting

```
Add formatting functions to my CCL implementation:
- print (structure-preserving round-trip)
- canonical_format (normalized output)

Follow https://ccl.tylerbutler.com/library-features/#formatting-functions
```

### Add Entry Processing

```
Add entry processing functions to my CCL implementation:
- filter (remove entries by predicate, e.g., comments)
- compose (concatenate entry lists)

Follow https://ccl.tylerbutler.com/library-features/
```

---

## Test Integration

### Set Up Test Suite

```
Set up test integration for my CCL implementation using the test suite at
https://github.com/tylerbutler/ccl-test-data

The tests are in generated_tests/*.json format. Filter tests to only run
those for functions I've implemented: parse, build_hierarchy.

See https://ccl.tylerbutler.com/test-suite-guide/ for test format details.
```

### Build Test Runner

```
Build a test runner for my [language] CCL implementation that:
1. Loads JSON tests from https://github.com/tylerbutler/ccl-test-data/generated_tests/
2. Filters by my implemented functions: [list your functions]
3. Runs each test and reports pass/fail
4. Handles the "expected" format with "count" fields

See https://ccl.tylerbutler.com/test-suite-guide/ for the test format.
```

### Run Specific Test Categories

```
Run only the parse function tests from the CCL test suite.

Filter tests where validation === "parse" from the generated_tests/ directory.
Report which tests pass and fail.
```

---

## Debugging & Maintenance

### Fix Failing Tests

```
My CCL parser is failing these tests: [paste test names or errors]

Review my implementation against the algorithm at
https://ccl.tylerbutler.com/parsing-algorithm/ and identify issues.

Common pitfalls are listed at
https://ccl.tylerbutler.com/ai-implementation-guide/#common-pitfalls
```

### Review Implementation

```
Review my CCL implementation for correctness.

Check against:
- Algorithm: https://ccl.tylerbutler.com/parsing-algorithm/
- Common pitfalls: https://ccl.tylerbutler.com/ai-implementation-guide/#common-pitfalls
- Behaviors: https://ccl.tylerbutler.com/behavior-reference/

Identify any deviations from the specification.
```

### Add Missing Error Handling

```
Review my CCL implementation's error handling.

The spec at https://ccl.tylerbutler.com/ai-implementation-guide/ describes
expected error cases. Ensure my implementation handles:
- Missing keys (path not found)
- Type mismatches (e.g., get_int on non-integer)
- Malformed input (lines without =)
```

---

## Quick Prompts

### One-Liner: Start Fresh

```
Implement CCL in [language] following https://ccl.tylerbutler.com/ai-implementation-guide/
```

### One-Liner: Quick Reference

```
Read https://ccl.tylerbutler.com/ai-quickstart/ for CCL terminology and concepts.
```

### One-Liner: Check My Work

```
Compare my CCL parser to the spec at https://ccl.tylerbutler.com/parsing-algorithm/
```

---

## Prompt Tips

**Be specific about functions:** Instead of "add more features," say "add get_string and get_int."

**Specify behaviors:** If you care about boolean parsing or list coercion, say so explicitly.

**Reference specific URLs:** Point to exact sections like `#get_list` for focused work.

**Include your constraints:** Language version, dependencies, style preferences.

**Mention the test suite:** Always reference https://github.com/tylerbutler/ccl-test-data for validation.
