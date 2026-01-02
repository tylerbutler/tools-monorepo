# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tree-sitter grammar for CCL (Categorical Configuration Language) - a minimalist indentation-based configuration language with Python-like block structure.

**Key Components:**
- **grammar.js**: Tree-sitter grammar definition with conflict resolution and precedence rules
- **src/scanner.cc**: C++20 external scanner implementing semantic indentation (INDENT/DEDENT tokens)
- **queries/**: Syntax highlighting (`highlights.scm`) and language injection (`injections.scm`)
- **test/corpus/**: Tree-sitter test corpus files (`.txt` format)
- **bindings/**: Node.js and Rust bindings for language integration

## Essential Commands

### Development Workflow

```bash
# Generate parser from grammar.js
pnpm run build
# OR: tree-sitter generate

# Run test corpus
pnpm test
# OR: tree-sitter test

# Parse a specific CCL file
pnpm run parse <file.ccl>
# OR: tree-sitter parse <file.ccl>

# Build for tree-sitter CLI (platform-specific)
pnpm run build:cli
# macOS: Compiles with clang++ and libc++
# Linux: Compiles with g++
# Windows: Not yet implemented
```

### Testing Individual Files

```bash
# Parse and show syntax tree
tree-sitter parse example.ccl

# Test specific corpus file
tree-sitter test -f "Basic key-value"

# Debug with verbose output
tree-sitter parse --debug file.ccl
```

### Clean Build

```bash
# Remove all build artifacts
pnpm run clean
# Removes: build/, prebuilds/, ~/.cache/tree-sitter/lib/ccl.so, temp objects
```

## Architecture

### Grammar Design

The grammar implements **two-tier parsing** for nested CCL content:

1. **Base Grammar**: Fast, deterministic parsing treating nested content as `content_line` nodes
2. **Injection Queries**: Modern editors re-parse `content_line` as structured CCL via `injections.scm`

**Why this design?**
- Universal compatibility (all tree-sitter tools work immediately)
- No parsing conflicts (grammar remains deterministic)
- Progressive enhancement (basic vs enhanced highlighting based on tool capabilities)

### External Scanner (scanner.cc)

**Critical for indentation handling:**
- Maintains indentation stack for nested block tracking
- Generates INDENT tokens when indentation increases
- Generates DEDENT tokens when indentation decreases (queued, one per scan)
- Handles cross-platform newlines (`\n`, `\r\n`)
- Implements lookahead DEDENT detection for complex parser states
- Tab width: 8 spaces (standard terminal convention)

**Compilation requirements:**
- C++20 compatible compiler (GCC 10+, Clang 12+, MSVC 2019+)
- Python 3.x (for node-gyp)
- Native build tools

**Debug build:**
```bash
# Enable comprehensive debug logging
CXXFLAGS="-std=c++20 -DDEBUG_SCANNER -g -O0" tree-sitter generate

# Parse with scanner debug output
tree-sitter parse --debug file.ccl
```

### Grammar Rules Structure

```javascript
// grammar.js key patterns:
externals: [newline, indent, dedent]  // External scanner tokens
conflicts: [[comment], [entry]]        // Resolved via precedence
extras: [/[ \t]/]                      // NOT newlines (significant for indentation)

rules: {
  document              // Root: sequence of entries/comments
  entry                 // Key-value assignment
  key                   // single_line_key OR multiline_key
  value                 // single_line_value, multiline_value_block, OR nested_content_block
  nested_content_block  // Nested CCL re-parsed via injection (two-pass parsing)
  content_line          // Raw text line in nested block (first pass)
  comment               // Single-line OR multiline with `/=` marker
}
```

**Precedence patterns:**
- `prec.right()`: Right-associative (used for optional continuations)
- `prec.left()`: Left-associative (default for sequences)
- Dynamic precedence: Resolves conflicts between comment types and entry forms

### Test Corpus Format

Tree-sitter test files in `test/corpus/*.txt` use special format:

```
================================================================================
Test name
================================================================================

input CCL code here

--------------------------------------------------------------------------------

(expected_syntax_tree
  (nodes))
```

**Testing guidelines:**
- Each corpus file tests a specific feature area (basic, multiline, comments, indentation)
- Add new tests when adding grammar features or fixing bugs
- Run `tree-sitter test` to verify all corpus tests pass

## Language Injection System

**Two-level syntax highlighting:**

1. **🟡 Basic** (all tools): Keys blue, values green, nested content as plain text
2. **🌈 Enhanced** (injection-aware tools): Full recursive CCL highlighting in nested blocks

**Tools with enhanced highlighting:**
- Neovim (nvim-treesitter), VS Code, Helix, Zed, GitHub

**How it works:**
- `queries/injections.scm` tells tools to re-parse `content_line` nodes as CCL
- No grammar complexity or conflicts
- Future-proof: enhances automatically as editor tools improve

## Common Development Tasks

### Modifying the Grammar

1. Edit `grammar.js`
2. Run `pnpm run build` to regenerate parser
3. Run `pnpm test` to verify corpus tests
4. Add new test cases in `test/corpus/` if adding features

### Modifying the External Scanner

1. Edit `src/scanner.cc`
2. Use debug build: `CXXFLAGS="-std=c++20 -DDEBUG_SCANNER -g -O0" tree-sitter generate`
3. Test incrementally with simple cases first
4. Validate state serialization/deserialization works
5. Add corpus tests for edge cases
6. Performance test: ensure no infinite loops

### Adding Query Patterns

**Syntax highlighting** (`queries/highlights.scm`):
```scheme
(single_line_key) @variable
(assignment) @operator
(single_line_value) @string
(comment) @comment
```

**Language injection** (`queries/injections.scm`):
```scheme
((content_line) @injection.content
 (#set! injection.language "ccl"))
```

## Troubleshooting

### Compilation Failures

**C++20 not recognized:**
```bash
# Specify explicitly
CXXFLAGS="-std=c++20" pnpm install

# Or for older GCC: -std=c++2a
CXXFLAGS="-std=c++2a" pnpm install
```

**macOS compiler issues:**
```bash
# Ensure Xcode Command Line Tools installed
xcode-select --install

# Use specific compiler
export CC=clang CXX=clang++
```

**Node-gyp Python errors:**
```bash
# Set Python version
npm config set python python3
```

### Grammar Conflicts

If `tree-sitter generate` reports conflicts:

1. Check `conflicts: []` array in grammar.js - all conflicts should be documented
2. Use precedence (`prec.left()`, `prec.right()`) to resolve
3. Consider dynamic precedence for semantic disambiguation
4. Test with `tree-sitter parse --debug` to see which rule is chosen

### Test Failures

```bash
# Run specific test
tree-sitter test -f "test name pattern"

# Update expected tree (only if change is intentional)
# Edit test/corpus/*.txt with correct expected tree

# Debug parse tree
tree-sitter parse file.ccl
```

## Integration Notes

### Monorepo Context

This package is part of the `tools-monorepo` using pnpm workspaces. However, it operates independently:

- Uses `pnpm` for package management (required by parent monorepo)
- Does not use Turbo build orchestration (tree-sitter has its own tooling)
- Standard tree-sitter CLI commands work directly

### Native Module Build

First install compiles C++ external scanner (may take a few minutes):

- **Dependencies**: `node-addon-api`, `node-gyp-build`
- **Prebuilds**: Can use `prebuildify` for distribution
- **Platform-specific**: Separate build scripts for macOS/Linux/Windows

### Editor Integration

For editor/tool integration, access files directly:

```javascript
const grammarPath = require.resolve('tree-sitter-ccl/grammar.js');
const highlightsPath = require.resolve('tree-sitter-ccl/queries/highlights.scm');
const injectionsPath = require.resolve('tree-sitter-ccl/queries/injections.scm');
```
