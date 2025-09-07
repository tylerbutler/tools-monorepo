# CCL Tree-sitter Parser Implementation Plan

## Current Status

**Working**: Flat parsing with basic syntax highlighting
**Goal**: Full recursive structure parsing with semantic indentation support

## Problem Statement

CCL uses **semantic indentation** where whitespace determines nested structure. This creates parsing challenges because:

1. **Context-sensitive parsing**: Same content has different meaning based on indentation level
2. **Recursive ambiguity**: Indented content could be CCL entries or plain text
3. **Multiple indent levels**: 2-space, 4-space, tab mixing creates complex state tracking

## Attempted Approaches & Results

### ❌ 1. Precedence-Based Disambiguation (#5)
**Approach**: Used `prec()` to prefer CCL parsing over plain content
```javascript
_value: $ => choice(
  prec(2, seq(/\r?\n/, $.ccl_block)),
  prec(1, seq(/\r?\n/, $.indented_content))
)
```
**Result**: FAILED - Tree-sitter still chose simpler content parsing
**Issue**: Precedence alone insufficient for context-sensitive decisions

### ❌ 2. Recursive Grammar Approach (#1)  
**Approach**: Direct recursion with `$._value` referencing nested blocks
```javascript
nested_entry: $ => seq($.key, $.assignment, $._value) // Recursive
```
**Result**: FAILED - Grammar conflicts with repeat constructs
**Issue**: Left-recursion conflicts: `nested_content_repeat1 • nested_content_repeat1`

### ❌ 3. Two-Phase Parsing Approach (#2)
**Approach**: Separate rules for flat content vs recursive CCL
```javascript
indented_content: $ => choice(
  $.nested_entries,  // Phase 2: Try recursive
  $.plain_content   // Phase 1: Fall back to flat
)
```
**Result**: FAILED - Similar precedence and conflict issues
**Issue**: Same fundamental ambiguity problem

### ❌ 4. External C++ Scanner (Incomplete)
**Approach**: C++ external scanner for INDENT/DEDENT tokens
```cpp
enum TokenType { INDENT, DEDENT, NEWLINE };
// Stack-based indentation tracking
```
**Result**: FAILED - Infinite loops/parser hangs
**Issue**: Logic errors in scanner implementation, needs debugging

## Recommended C/C++ External Scanner Plan

### Phase 1: Minimal Working Scanner
**Goal**: Get basic INDENT/DEDENT working without hangs

#### Scanner Structure
```cpp
struct Scanner {
  std::vector<uint16_t> indent_stack;
  bool at_line_start;
  uint16_t pending_dedents;
};
```

#### Implementation Steps
1. **Start simple**: Only handle NEWLINE tokens initially
2. **Add indentation tracking**: Count spaces/tabs at line start
3. **Implement INDENT logic**: Push to stack when deeper
4. **Implement DEDENT logic**: Pop from stack when shallower
5. **Handle multiple DEDENT**: Queue multiple dedent tokens

#### Debug Strategy
- Add extensive logging to scanner functions
- Test with minimal cases: `key = value` → `key =\n  nested = value`
- Use `tree-sitter parse --debug` for detailed output
- Validate serialization/deserialization logic

### Phase 2: Grammar Integration
**Goal**: Update grammar to use external tokens effectively

#### Grammar Structure
```javascript
externals: $ => [$.newline, $.indent, $.dedent],

nested_block: $ => seq(
  $.newline,
  $.indent,
  repeat($._nested_item),
  $.dedent
),

_nested_item: $ => choice(
  $.entry,        // Recursive CCL entries
  $.comment,      // CCL comments  
  $.plain_line    // Plain text fallback
)
```

#### Key Principles
- **Explicit newline handling**: Don't rely on `extras`
- **Clear token boundaries**: INDENT starts block, DEDENT ends block
- **Graceful fallback**: Plain text when CCL parsing fails

### Phase 3: Advanced Features
**Goal**: Handle CCL edge cases and complex scenarios

#### Edge Cases to Handle
1. **Mixed indentation**: Spaces + tabs in same file
2. **Empty lines**: Don't affect indentation state
3. **Comments**: CCL `/=` comments within nested blocks
4. **EOF handling**: Implicit DEDENT at end of file
5. **Malformed indentation**: Recovery strategies

#### Advanced Scanner Features
```cpp
struct Scanner {
  std::vector<uint16_t> indent_stack;
  std::queue<TokenType> pending_tokens;  // Queue multiple DEDENTs
  bool mixed_indentation_warning;
  uint16_t tab_width;
};
```

## Advanced Debugging Techniques for External Scanners

### 1. Tree-sitter Debug Commands
```bash
# Exhaustive parsing step logging
tree-sitter parse --debug file.ccl > debug.log

# Visual debugging with graphs (requires graphviz)  
tree-sitter parse --debug-graph file.ccl
# Opens log.html with SVG visualization of parse trees and token chains
```

### 2. External Scanner Debugging Patterns
```cpp
// Debug logging in scanner.cc
#ifdef DEBUG_SCANNER
#define DEBUG_LOG(fmt, ...) fprintf(stderr, "[SCANNER] " fmt "\n", ##__VA_ARGS__)
#else
#define DEBUG_LOG(fmt, ...)
#endif

bool scan(TSLexer *lexer, const bool *valid_symbols) {
  DEBUG_LOG("scan() called, lookahead='%c' (%d)", lexer->lookahead, lexer->lookahead);
  DEBUG_LOG("valid symbols: NEWLINE=%d INDENT=%d DEDENT=%d", 
    valid_symbols[NEWLINE], valid_symbols[INDENT], valid_symbols[DEDENT]);
  
  // Log indentation stack state
  DEBUG_LOG("indent_stack size=%zu, current=%d", 
    indents.size(), indents.empty() ? -1 : indents.back());
}
```

### 3. State Validation Techniques
```cpp
// Detect invalid scanner calls (all symbols valid = error state)
bool all_valid = true;
for (int i = 0; i < TOKEN_COUNT; i++) {
  if (!valid_symbols[i]) { all_valid = false; break; }
}
if (all_valid) {
  DEBUG_LOG("All symbols valid - bailing out (error branch)");
  return false;  // Avoid infinite loops
}

// Validate serialization round-trip
void validate_serialization() {
  char buffer[1024];
  unsigned len = serialize(buffer);
  Scanner copy;
  copy.deserialize(buffer, len);
  assert(copy.indents == this->indents);
}
```

### 4. Test-Driven Development
```cpp
// Create test/corpus/indentation.txt
====
Basic indentation
====

key = value
nested =
  inner = true
  deep =
    level = 3

---

(document
  (entry (single_line_key) (assignment) (single_line_value))
  (entry 
    (single_line_key) (assignment)
    (nested_block
      (indent)
      (entry (single_line_key) (assignment) (single_line_value))
      (entry
        (single_line_key) (assignment)
        (nested_block
          (indent)
          (entry (single_line_key) (assignment) (single_line_value))
          (dedent)))
      (dedent))))
```

### 5. Common External Scanner Issues & Fixes

#### Issue: Infinite Loops
**Cause**: Scanner doesn't advance lexer position
```cpp
// BAD: Can cause infinite loops
if (lexer->lookahead == ' ') {
  // lexer->advance(lexer, false);  // Missing!
  return false;
}

// GOOD: Always advance or return
if (lexer->lookahead == ' ') {
  lexer->advance(lexer, false);  // Always advance
  // ... rest of logic
}
```

#### Issue: State Corruption  
**Cause**: Incomplete serialize/deserialize
```cpp
// GOOD: Full state serialization
struct Scanner {
  std::vector<uint16_t> indents;
  bool at_line_start;
  uint16_t pending_dedents;  // Don't forget this!
  
  unsigned serialize(char *buffer) {
    // Serialize ALL fields, not just indents
    memcpy(buffer, &at_line_start, sizeof(bool));
    memcpy(buffer + sizeof(bool), &pending_dedents, sizeof(uint16_t));
    // ... serialize indents vector
  }
};
```

#### Issue: Parse Position Jumping
**Cause**: Scanner assumes sequential parsing
```cpp
// GOOD: Handle arbitrary parse position changes  
bool scan(TSLexer *lexer, const bool *valid_symbols) {
  // GLR parser can jump to any file position
  // Don't assume we're at "next" character
  
  // Reset line-start detection on position changes
  if (last_position != lexer->get_column(lexer)) {
    at_line_start = (lexer->get_column(lexer) == 0);
    last_position = lexer->get_column(lexer);
  }
}
```

### 6. Performance Debugging
```cpp
// Monitor scanner performance
#include <chrono>

bool scan(TSLexer *lexer, const bool *valid_symbols) {
  auto start = std::chrono::high_resolution_clock::now();
  
  bool result = scan_impl(lexer, valid_symbols);
  
  auto end = std::chrono::high_resolution_clock::now();
  auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
  
  DEBUG_LOG("scan() took %ld microseconds", duration.count());
  return result;
}
```

## Implementation Roadmap

### Step 1: Environment Setup
- [ ] Set up C++ compilation toolchain with debug flags
- [ ] Install graphviz for visual debugging (`apt install graphviz`)
- [ ] Create debug build configuration with `-DDEBUG_SCANNER`
- [ ] Verify `tree-sitter generate` works with scanner.cc
- [ ] Create minimal test CCL files for validation

### Step 2: Debug-First Scanner Implementation (Week 1)
- [ ] Implement comprehensive debug logging system
- [ ] Create NEWLINE-only scanner with debug output  
- [ ] Use `tree-sitter parse --debug` to validate no infinite loops
- [ ] Add state validation and serialization round-trip tests
- [ ] Implement "all symbols valid" detection for error branches

### Step 3: Incremental Feature Addition (Week 1)
- [ ] Add basic indentation counting (spaces only) with debug logs
- [ ] Implement simple INDENT logic with state logging
- [ ] Add DEDENT logic with stack state validation
- [ ] Test each feature in isolation before combining

### Step 4: Grammar Integration with Testing (Week 2)
- [ ] Create test/corpus/ files for each indentation scenario
- [ ] Update grammar to use external tokens incrementally
- [ ] Use `tree-sitter test` to validate each change
- [ ] Handle plain text fallback cases with test coverage

### Step 5: Advanced Debugging & Edge Cases (Week 2)  
- [ ] Use `--debug-graph` for visual parse tree analysis
- [ ] Add performance monitoring to identify bottlenecks
- [ ] Handle parse position jumping in GLR parsing
- [ ] Test mixed spaces/tabs and malformed indentation
- [ ] Support multiple DEDENT tokens with queue debugging

### Step 6: Comprehensive Validation (Week 3)
- [ ] Compare AST with Gleam CCL parser output
- [ ] Performance testing with large CCL files using profiling
- [ ] Edge case testing (empty lines, comments, EOF) with debug logs
- [ ] Integration testing with editors (VS Code, etc.)

## Risk Mitigation

### High-Risk Areas
1. **Scanner hanging**: Infinite loops in external scanner logic
2. **Grammar conflicts**: Ambiguous parsing rules
3. **State management**: Incorrect indentation stack handling
4. **Token ordering**: INDENT/DEDENT/NEWLINE sequence issues

### Mitigation Strategies
1. **Incremental development**: Test each feature in isolation
2. **Extensive logging**: Debug output for all scanner decisions
3. **Reference implementation**: Compare with Python tree-sitter scanner
4. **Fallback mechanism**: Graceful degradation to flat parsing

## Success Metrics

### Minimum Viable Product
- [ ] Parse basic nested CCL without hangs
- [ ] Correct AST structure for 2-level nesting
- [ ] Handle mixed CCL/plain text content
- [ ] No infinite loops or crashes

### Full Success
- [ ] Parse all CCL test suite files correctly
- [ ] Performance comparable to flat parsing
- [ ] Robust error recovery
- [ ] Editor integration working

## Alternative Approaches

If external scanner proves too complex:

1. **Post-processing approach**: Parse flat, then build structure
2. **Hybrid parsing**: Use existing CCL parsers for semantic analysis
3. **Limited recursion**: Support only 2-3 nesting levels
4. **Syntax highlighting focus**: Accept flat parsing for editor use

## Resources

- **Python scanner reference**: https://github.com/tree-sitter/tree-sitter-python/blob/master/src/scanner.c  
- **Tree-sitter external scanner docs**: https://tree-sitter.github.io/tree-sitter/creating-parsers/4-external-scanners.html
- **CCL specification**: /home/tylerbu/code/ccl_gleam/plans/ccl_blog_reference.md
- **Test files**: /home/tylerbu/code/ccl_gleam/tree-sitter-ccl/*.ccl