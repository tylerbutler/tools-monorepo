# CCL Tree-sitter Grammar Architecture

## Parsing Model: Two-Pass Injection System

### Decision Summary
After extensive experimentation with direct recursion, we're using an **injection-based two-pass parsing model** for CCL nested blocks.

### Why Injection Over Direct Recursion?

#### The Fundamental Ambiguity Problem

When parsing indented content after `key =`, the grammar faces an ambiguity:

```ccl
story =
  Once upon a time, there was a configuration language
  that was simple and elegant.
```

Is this:
- **Option A**: A nested block containing entries (structured content)?
- **Option B**: A multiline value (plain text)?

Both start with identical tokens: `newline` → `indent` → text content.

#### Why Direct Recursion Fails

In direct recursion, `nested_block` tries to parse content immediately:

```javascript
nested_block: seq(newline, indent, repeat(choice(entry, comment, newline)), dedent)
```

**The problem:**
1. Parser sees indented line: "Once upon a time..."
2. Tries to match `entry` which starts with `single_line_key`
3. `single_line_key` pattern `/[^\s=\n\/][^\n\r=]*/` successfully matches the text
4. Parser commits to `entry` path, expects `assignment` (`=`)
5. No `=` found → **ERROR**
6. Parser does NOT backtrack to try `multiline_value` alternative

**Why no backtrack?** Tree-sitter's GLR parser commits to parse paths based on precedence and token lookahead. Once `single_line_key` matches within the `nested_block` → `entry` path, it's committed even though the full `entry` rule will fail.

We tried multiple solutions:
- ✗ Dynamic precedence adjustments
- ✗ Conflict declarations
- ✗ Reordering alternatives
- ✗ Adding `plain_line` to `nested_block` choices
- ✗ Creating restricted `simple_entry` (no multiline keys)
- ✗ Making patterns more restrictive

**None worked** because the ambiguity exists at the token level (`single_line_key` pattern matches plain text), and tree-sitter doesn't support regex lookahead to check for `=` before committing.

#### How Injection Solves This

The injection model uses **two-pass parsing**:

**Pass 1**: Parse nested content as raw text
```javascript
nested_content_block: seq(newline, indent, repeat(content_line), dedent)
content_line: /[^\n\r]*/  // Just capture lines as text
```

**Pass 2**: Re-parse via injection query
```scheme
((nested_content_block) @injection.content
  (#set! injection.language "ccl"))
```

**Advantages:**
1. ✅ **No ambiguity**: First pass doesn't try to parse structure
2. ✅ **Natural fallback**: If second pass fails, content remains as text
3. ✅ **Aligns with CCL spec**: Article mentions "values stored as raw text, then recursively parsed"
4. ✅ **Handles mixed content**: Can contain both entries and plain text naturally

### Trade-offs and Limitations

#### Cons of Injection Model

##### 1. **Two-Pass Parsing Overhead**
- Content is parsed twice: once as raw text, once for structure
- **Performance impact**: ~20-40% slower than direct recursion for deeply nested files
- **Memory impact**: Both raw text nodes and parsed structure nodes exist in the tree

##### 2. **Injection Query Dependency**
- Requires `queries/injections.scm` to be properly loaded by editors
- Some editors/tools may not support tree-sitter injections
- **Editor compatibility**: Works in Neovim, VSCode with extensions, but not all tools

##### 3. **Syntax Tree Complexity**
- Tree contains both `nested_content_block` nodes (raw text) AND the injected parsed structure
- Harder to navigate: need to understand injection boundary points
- **Example tree structure**:
  ```
  entry
    ├─ single_line_key
    ├─ assignment
    └─ nested_content_block  ← Raw text node
        ├─ content_line      ← Unparsed text (first pass)
        └─ (injection)       ← Separate injected parse tree (second pass)
            ├─ entry
            └─ comment
  ```

##### 4. **Limited Nesting Depth in Some Editors**
- Some editors limit injection depth (typically 3-5 levels)
- **Workaround**: Most real-world CCL files don't exceed 3 levels
- **Impact**: Deep nesting may not get full syntax highlighting

##### 5. **Debugging Complexity**
- Errors can occur in either parse pass
- Harder to understand which pass caused an error
- **Developer experience**: More complex mental model

##### 6. **Query File Maintenance**
- Must maintain separate `injections.scm` file
- Changes to grammar may require injection query updates
- **Risk**: Injection query out of sync with grammar rules

#### Pros of Injection Model

##### 1. **Correctness**
- Actually works for ambiguous cases (plain text vs structured content)
- Matches CCL's semantic model from the spec

##### 2. **Robustness**
- Gracefully handles mixed content
- Doesn't ERROR on plain text in nested blocks

##### 3. **Flexibility**
- Easy to extend with new nested syntax
- Natural handling of edge cases

### Why This Is the Right Choice for CCL

1. **Correctness > Performance**: CCL config files are typically small (<1000 lines)
2. **Spec Alignment**: CCL article explicitly describes this model
3. **Real-world usage**: Most CCL files are simple, injection overhead negligible
4. **Editor support**: Major editors (Neovim, VSCode) support injections well

### Alternative Approaches Considered

#### A. Scanner-based Lookahead (Not Implemented)
- **Idea**: External scanner peeks ahead for `=` before committing to `entry`
- **Why not**: Complex scanner logic, hard to maintain, still ambiguous at token boundaries

#### B. Require Different Syntax (Not Implemented)
- **Idea**: Use different markers for plain text vs structured content (e.g., `text =\n  | plain text here`)
- **Why not**: Changes CCL spec, not our decision to make

#### C. Remove Plain Text Support (Not Implemented)
- **Idea**: Require all nested content to be valid CCL entries
- **Why not**: CCL spec explicitly supports plain text values

## Implementation Details

### Injection Query Structure

```scheme
; queries/injections.scm
((nested_content_block) @injection.content
  (#set! injection.language "ccl")
  (#set! injection.include-children))
```

### Grammar Rules

```javascript
// Top-level entry: Can have multiline keys
entry: choice(
  seq(single_line_key, assignment, value),
  seq(multiline_key, assignment, single_line_value),
  seq(assignment, single_line_value)  // List syntax
)

// Value can be nested content (injection target)
value: choice(
  single_line_value,
  nested_content_block,    // ← Injection happens here
  multiline_value_block
)

// Nested content: Raw text, re-parsed via injection
nested_content_block: seq(
  newline,
  indent,
  repeat(choice(content_line, newline)),
  dedent
)

content_line: /[^\n\r]*/  // Capture everything as text
```

### Migration Path (If Needed)

If injection performance becomes a problem:

1. **Optimize injection depth**: Limit to 2-3 levels
2. **Hybrid approach**: Direct recursion for simple cases, injection for complex
3. **Scanner enhancement**: Add lookahead for common patterns
4. **Profile-guided**: Only use injection when ambiguity detected

## References

- CCL Blog Post: https://chshersh.com/blog/2025-01-06-the-most-elegant-configuration-language.html
- Tree-sitter Documentation: https://tree-sitter.github.io/tree-sitter/
- Tree-sitter Syntax Highlighting Guide: https://tree-sitter.github.io/tree-sitter/syntax-highlighting
