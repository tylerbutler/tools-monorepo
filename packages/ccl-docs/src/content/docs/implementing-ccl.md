---
title: Implementing CCL
description: Language-specific patterns and guidance for building CCL implementations.
---

:::tip[Core Philosophy]
**Adapt this API to your language's idioms.** There's no required API - make choices that feel natural for your ecosystem.
:::

## Core Requirements

Every CCL implementation needs two operations:

1. **Parse** - Convert text to flat key-value entries
2. **Build Hierarchy** - Convert entries to nested structure via recursive parsing

Everything else is optional library convenience.

## Language Patterns

### Functional (Gleam, OCaml)

```gleam
pub fn parse(text: String) -> Result(List(Entry), ParseError)
pub fn build_hierarchy(entries: List(Entry)) -> Result(CCL, ObjectError)
```

Use Result types, pattern matching, immutable data.

### Imperative (Go, Java)

```go
func Parse(text string) ([]Entry, error)
func BuildHierarchy(entries []Entry) (CCL, error)
```

Use error returns, interfaces, builder patterns.

### Dynamic (Python, JavaScript)

```python
def parse(text: str) -> list[Entry]
def build_hierarchy(entries: list[Entry]) -> CCL
```

Use exceptions, native collections, optional type hints.

## Recursive Parsing Algorithm

```pseudocode
function build_hierarchy(entries):
    result = {}
    for (key, value) in entries:
        if key == "":
            add_to_list(result, value)
        else if value_looks_like_ccl(value):
            nested = parse(value)
            result[key] = build_hierarchy(nested)  # Recurse
        else:
            result[key] = value
    return result
```

**Fixed-point termination**: Recurse until no more CCL syntax found.

See [Parsing Algorithm](/parsing-algorithm) for details.

## Optional Features

**Type-Safe Access** (library convenience):
```pseudocode
get_string(ccl, path...): string
get_int(ccl, path...): int
```

**Entry Processing** (composition utilities):
```pseudocode
filter(entries, predicate): entries
compose(entries1, entries2): entries
```

See [Library Features](/library-features) for details.

## Testing

Use [CCL Test Suite](https://github.com/tylerbutler/ccl-test-data) (447 assertions, 205 tests):

1. **Core Parsing**: Filter tests by `functions: ["parse"]`
2. **Object Construction**: Filter by `functions` containing `build_hierarchy`
3. **Typed Access**: Filter by `validation` starting with `get_`
4. **Optional Features**: Filter by `features` arrays (`comments`, `experimental_dotted_keys`, etc.)

See [Test Suite Guide](/test-suite-guide) for complete filtering examples.

## Internal Representation Choices

How you represent CCL data internally affects which features are easy to implement.

### The OCaml Approach

The reference OCaml implementation represents all data as nested `KeyMap` structures:

```ocaml
type ccl = KeyMap of ccl StringMap.t
```

**Advantages**:
- Uniform data structure (everything is a nested map)
- Elegant recursion with `fix` function
- Clean pattern matching and algebraic properties

**Trade-off**: This model cannot distinguish between a string value:
```ccl
name = Alice
```
and a nested key with empty value:
```ccl
name =
  Alice =
```

Both produce identical models: `{ "name": { "Alice": {} } }`

### Alternative: Tagged Union

For implementations that need structure-preserving `print`, use a tagged union:

```pseudocode
type Value =
  | String(string)
  | Object(map<string, Value>)
  | List(list<Value>)
```

**Advantages**:
- Easy to implement `print` (structure recovery is straightforward)
- Can distinguish string values from nested structures
- Natural representation for most languages

### Lazy Hierarchy Building

Another approach: preserve original entries and build hierarchy on-demand:

```pseudocode
type CCL = {
  entries: List(Entry),
  hierarchy: Lazy(Object)
}
```

**Advantages**:
- Perfect structure preservation for `print`
- Can support both `print` and `canonical_format`
- Deferred parsing cost

See [Library Features](/library-features#formatting-functions) for details on `print` vs `canonical_format`.

## Common Challenges

**Infinite Recursion**: Fixed-point algorithm terminates naturally

**Duplicate Keys**: Merge into object or list based on value types

**Empty Keys**: Treat `= value` as list item

**Unicode/CRLF**: Break _only_ on LF; preserve CR, preserve unicode

See [Syntax Reference](/syntax-reference) for edge cases.
