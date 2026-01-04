---
title: Continuation Lines
description: Understanding how CCL determines which lines are part of a value vs new entries.
---

# Continuation Lines

CCL uses indentation to determine whether a line continues the previous value or starts a new entry. This page explains the rules in detail, including the critical distinction between **top-level** and **nested** parsing contexts.

## The Basic Rule

When parsing CCL, each line's indentation is compared to a **baseline** value (called **N**):

| Line Indentation | Result |
|------------------|--------|
| `> N` | **Continuation** - line is part of the current value |
| `≤ N` | **New entry** - line starts a new key-value pair |

The key question is: **how is N determined?**

## Two Parsing Contexts

CCL has two parsing contexts with different rules for determining N:

### Top-Level Parsing

When parsing a CCL document from the beginning, how N is determined depends on the `toplevel_indent_strip` vs `toplevel_indent_preserve` behavior choice (see [Behavior Reference](/behavior-reference#continuation-baseline)).

#### With `toplevel_indent_strip` (default)

**N is always 0.** Any line with leading whitespace becomes a continuation. This is the OCaml reference implementation's behavior.

```ccl
server =
  host = localhost
  port = 8080
```

**Parsing:**
1. Line 1: `server =` at indent 0 → first entry, key = "server"
2. Line 2: `  host = localhost` at indent 2 → 2 > 0 → **continuation**
3. Line 3: `  port = 8080` at indent 2 → 2 > 0 → **continuation**

**Result:** One entry: `{key: "server", value: "\n  host = localhost\n  port = 8080"}`

#### With `toplevel_indent_preserve`

**N equals the first key's indentation.** Lines at the same indentation as the first key are separate entries.

```ccl
  server = localhost
  port = 8080
```

**Parsing:**
1. Line 1: `  server = localhost` at indent 2 → first entry, N = 2
2. Line 2: `  port = 8080` at indent 2 → 2 > 2 is **false** → **new entry**

**Result:** Two entries: `{key: "server", value: "localhost"}` and `{key: "port", value: "8080"}`

With `toplevel_indent_strip`, this same input would produce **one entry** because 2 > 0 makes line 2 a continuation.

### Nested Parsing (N = first line's indent)

When recursively parsing a multiline value (which starts with a newline), **N is determined from the first content line's indentation**.

The value from above is `"\n  host = localhost\n  port = 8080"`. When `build_hierarchy` parses this:

1. Text starts with `\n` → this is a nested context
2. Skip the newline, find first content line: `  host = localhost`
3. First line has indent 2 → **N = 2**
4. Line `  port = 8080` has indent 2 → 2 > 2 is **false** → new entry

**Result:** Two entries: `{key: "host", value: "localhost"}` and `{key: "port", value: "8080"}`

## Why Two Contexts?

The distinction between top-level and nested parsing exists because the OCaml reference uses `toplevel_indent_strip`:

- `kvs_p` - top-level, uses `prefix_len = 0`
- `nested_kvs_p` - nested, determines `prefix_len` from first content line

With `toplevel_indent_strip`, you need two different algorithms: one that forces N=0, and one that determines N dynamically.

**With `toplevel_indent_preserve`, the distinction disappears.** Both top-level and nested parsing use the same algorithm: determine N from the first non-empty line's indentation. This simplifies implementation—you only need one parsing function that works for all contexts.

## Detecting Context

How the baseline is determined depends on which behavior you're implementing:

### With `toplevel_indent_strip` (OCaml reference)

Context detection is required:

```pseudocode
function determine_baseline(text):
    if text is empty or text[0] != '\n':
        return 0  // Top-level: always N = 0

    // Nested context: find first non-empty line after the newline
    skip the leading newline
    for each line:
        if line is not empty:
            return count_leading_whitespace(line)
    return 0
```

### With `toplevel_indent_preserve` (simplified)

No context detection needed—use the same algorithm everywhere:

```pseudocode
function determine_baseline(text):
    // Same algorithm for top-level and nested
    for each line in text:
        if line is not empty:
            return count_leading_whitespace(line)
    return 0
```

This is simpler because you don't need to check whether the text starts with `\n`.

## Worked Examples

### Example 1: Simple Top-Level

```ccl
key = value
next = another
```

- Line 1: indent 0, N=0 → 0 > 0 is false → new entry
- Line 2: indent 0, N=0 → 0 > 0 is false → new entry

**Result:** 2 entries

### Example 2: Indented Top-Level Document

```ccl
  key = value
  next = another
```

Both lines have indent 2. The result depends on the baseline behavior:

**With `toplevel_indent_strip`:**
- Line 1: indent 2, N=0 → 2 > 0 is **true** → first entry starts
- Line 2: indent 2, N=0 → 2 > 0 is **true** → **continuation!**

**Result:** 1 entry with key="key", value="value\n  next = another"

**With `toplevel_indent_preserve`:**
- Line 1: indent 2 → first entry starts, N=2
- Line 2: indent 2, N=2 → 2 > 2 is **false** → **new entry**

**Result:** 2 entries: `{key: "value"}` and `{next: "another"}`

This difference matters when CCL documents are embedded within other files or indented for readability.

### Example 3: Nested Value Parsing

Given this nested value (from a parent entry):
```
"\n  host = localhost\n  port = 8080"
```

- Starts with `\n` → nested context
- First content line `  host = localhost` has indent 2 → N=2
- Line `  host = localhost`: indent 2, N=2 → 2 > 2 is false → new entry
- Line `  port = 8080`: indent 2, N=2 → 2 > 2 is false → new entry

**Result:** 2 entries

### Example 4: Deeper Nesting

```ccl
database =
  primary =
    host = localhost
    port = 5432
  replica =
    host = replica.local
```

Top-level parse produces:
```
{key: "database", value: "\n  primary =\n    host = localhost\n    port = 5432\n  replica =\n    host = replica.local"}
```

Nested parse of the value (N=2):
```
{key: "primary", value: "\n    host = localhost\n    port = 5432"}
{key: "replica", value: "\n    host = replica.local"}
```

Nested parse of primary's value (N=4):
```
{key: "host", value: "localhost"}
{key: "port", value: "5432"}
```

## Edge Cases

### Empty Lines

Empty lines (containing only whitespace or nothing) are typically skipped during continuation detection. They don't break a continuation:

```ccl
message =
  line one

  line three
```

The empty line between "line one" and "line three" is preserved in the value.

### Mixed Tabs and Spaces

CCL counts whitespace characters, not visual columns. With default `tabs_as_whitespace` behavior:

```
\tkey = value      // indent = 1 (one tab)
  other = value    // indent = 2 (two spaces)
```

These have different indentation counts. For consistent behavior, use spaces only or configure `tabs_as_content`.

### Whitespace-Only Lines

A line containing only spaces (no visible content) typically has its whitespace counted for indentation purposes but is treated as empty for continuation logic.

## Implementation Pattern

Here's pseudocode for a complete implementation. The main parsing loop is the same for both behaviors—only `determine_baseline` differs.

```pseudocode
function parse(text):
    baseline = determine_baseline(text)
    entries = []
    pos = 0

    while pos < text.length:
        // Find next '=' and extract key
        eq_index = find_next_equals(text, pos)
        key = extract_and_trim_key(text, pos, eq_index)

        // Collect value lines
        value_lines = []
        value_start = eq_index + 1

        // Get first line of value
        first_line = get_line_after(text, value_start)
        value_lines.append(trim_start(first_line))

        // Collect continuation lines
        scan_pos = after first line
        while scan_pos < text.length:
            line = get_line_at(text, scan_pos)
            indent = count_leading_whitespace(line)

            if is_empty(line):
                // Check if more continuations follow
                if has_more_continuations(text, scan_pos, baseline):
                    value_lines.append("")
                    scan_pos = next_line(scan_pos)
                    continue
                else:
                    break

            if indent > baseline:
                value_lines.append(line)  // Continuation
                scan_pos = next_line(scan_pos)
            else:
                break  // New entry

        entries.append({key, join(value_lines, "\n")})
        pos = scan_pos

    return entries
```

### `toplevel_indent_strip` (OCaml reference)

```pseudocode
function determine_baseline(text):
    if text.length == 0 or text[0] != '\n':
        return 0  // Top-level: always 0

    // Nested: find first content line's indent
    pos = 1  // Skip leading newline
    while pos < text.length:
        line_end = find_newline(text, pos)
        line = text[pos:line_end]
        if not is_empty(line):
            return count_leading_whitespace(line)
        pos = line_end + 1

    return 0
```

### `toplevel_indent_preserve` (simplified)

```pseudocode
function determine_baseline(text):
    // Same algorithm for all contexts
    for each line in text:
        if not is_empty(line):
            return count_leading_whitespace(line)
    return 0
```

## Summary

| Behavior | Baseline Algorithm | Implementation Complexity |
|----------|-------------------|--------------------------|
| `toplevel_indent_strip` | N=0 for top-level, N=first line for nested | Requires context detection |
| `toplevel_indent_preserve` | N=first line for all contexts | Single algorithm, simpler |

With `toplevel_indent_preserve`, you only need one `parse` function. With `toplevel_indent_strip`, you need context detection to distinguish top-level from nested parsing.

See [Behavior Reference](/behavior-reference#continuation-baseline) for guidance on choosing between behaviors.
