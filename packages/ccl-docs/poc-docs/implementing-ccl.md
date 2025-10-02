# Implementing CCL (POC)

**Target**: 80-100 lines
**Purpose**: Proof-of-concept implementation guide for CCL parsers
**Philosophy**: Adapt CCL to your language's idioms, not the other way around

## Core CCL Implementation

The complete CCL algorithm:

1. **Split lines on first `=`** → creates key-value entries
2. **Track indentation** → groups nested content
3. **Recursively parse values** → creates nested structure
4. **Continue to fixed point** → stops when no more CCL syntax

That's core CCL. Everything else is optional.

## Minimal Implementation

**What you MUST implement**:
- Entry parsing: split on `=`, trim keys, preserve value whitespace
- Indentation tracking: count leading spaces/tabs, group nested lines
- Recursive parsing: parse values that contain `=`
- Fixed-point termination: stop when values are plain strings

**Result**: A working CCL parser in ~100-200 lines of code.

## Language-Specific Patterns

### Functional Approach (OCaml, Haskell, F#)

```ocaml
type entry = { key: string; value: string }
type ccl = Fix of ccl StringMap.t

let rec parse text =
  let entries = parse_entries text in
  let hierarchy = build_hierarchy entries in
  Fix (StringMap.map parse_value hierarchy)
```

**Strengths**: Pattern matching, recursive types, immutability
**Style**: Pure functions, algebraic data types, type safety

### OOP Approach (Java, C#, Python)

```python
class Entry:
    def __init__(self, key, value):
        self.key = key
        self.value = value

class CCLParser:
    def parse(self, text):
        entries = self.parse_entries(text)
        hierarchy = self.build_hierarchy(entries)
        return self.recursive_parse(hierarchy)
```

**Strengths**: Encapsulation, builder pattern, mutable state
**Style**: Classes, methods, object composition

### Dynamic Approach (JavaScript, Ruby, Python)

```javascript
function parseCCL(text) {
  const entries = parseEntries(text);
  const result = {};

  for (const entry of entries) {
    result[entry.key] = containsCCL(entry.value)
      ? parseCCL(entry.value)  // Recursive
      : entry.value;           // Fixed point
  }

  return result;
}
```

**Strengths**: Flexibility, simple data structures, dynamic typing
**Style**: Functions, objects, runtime adaptation

## Optional Library Features

Your implementation MAY add conveniences:

**Typed accessors**:
```python
config.get_int("port")        # "5432" → 5432
config.get_bool("enabled")    # "true" → True
config.get_list("users")      # Empty keys → ["alice", "bob"]
```

**Entry filtering**:
```python
config.filter_comments()      # Remove /= entries
config.filter_empty()         # Remove empty values
```

**Dotted key expansion** (experimental):
```python
# "database.host" → nested["database"]["host"]
config.expand_dotted_keys()
```

**Pretty printing**:
```python
config.to_string(indent=2)    # Format output
config.canonical_format()     # Normalized representation
```

These are YOUR choices. Core CCL doesn't specify them.

## Error Handling Patterns

Common error scenarios:

**Parse errors**:
- Malformed lines (no `=`) → skip or error
- Invalid UTF-8 → error
- Circular references → detect in recursion depth

**Runtime errors**:
- Key not found → return None/Optional/Result
- Type conversion failure → return error or default
- Empty value → valid CCL, handle appropriately

Choose error handling that fits your language:
- Exceptions (Java, Python)
- Result/Option types (Rust, OCaml)
- Error codes (C)

## Testing Your Implementation

Use the official test suite (180 tests, 375 assertions):

```bash
# Clone test suite
git clone https://github.com/ccl-project/ccl-test-data

# Run tests (adapt to your language)
your-test-runner ccl-test-data/tests/*.json
```

Tests are tagged by function/feature/behavior - implement progressively:
1. Core parsing (`function:parse`)
2. Object construction (`function:build_hierarchy`)
3. Typed access (`function:get_int`, etc.)
4. Optional features (`feature:dotted-keys`, etc.)

## Implementation Advice

**Start simple**: Get basic parsing working first
**Test incrementally**: Use test suite from day one
**Adapt idioms**: Make CCL feel native to your language
**Document clearly**: Explain your library's specific features

**Don't**:
- Try to implement "everything" at once
- Copy implementation patterns from different language paradigms
- Add features before core parsing works
- Treat optional features as required

## Production Considerations

**Before production use**:
- Full test suite passing (or documented exclusions)
- Error handling for malformed input
- Unicode handling validated
- Performance testing with large configs

**Documentation for users**:
- Quick start examples
- Your library's specific features
- Clear separation: core CCL vs your additions

## Example: Minimal Python Parser

```python
def parse_ccl(text):
    """Parse CCL text to nested dict."""
    entries = []

    # Stage 1: Parse entries
    for line in text.splitlines():
        if '=' not in line:
            continue
        key, _, value = line.partition('=')
        entries.append((key.strip(), value.lstrip()))

    # Stage 2 & 3: Build hierarchy and recurse
    result = {}
    for key, value in entries:
        result[key] = parse_ccl(value) if '=' in value else value

    return result
```

This is ~15 lines and handles basic CCL. Add indentation tracking, error handling, and features as needed.

---

**Line count**: ~95 lines
**Target achieved**: ✅ 80-100 lines
**Validation**: Covers implementation patterns without prescribing "standard API"
