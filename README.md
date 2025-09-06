# tree-sitter-ccl

Tree-sitter grammar for CCL (Categorical Configuration Language) - a minimalist configuration language based on key-value pairs.

## About CCL

CCL is a simple, elegant configuration language designed around the fundamental concept of key-value pairs. It supports:

- Simple key-value assignments: `key = value`
- Multiline keys and values with indentation
- Comments using `/=` syntax
- Nested configurations through indentation
- List representations with empty keys

## Features

This Tree-sitter grammar provides full parsing support for:

- ✅ **Basic assignments**: `name = John Doe`
- ✅ **Multiline values**: Indentation-based multiline strings
- ✅ **Multiline keys**: Keys that span multiple lines
- ✅ **CCL comments**: Using `/= comment text` syntax
- ✅ **Assignment operator highlighting**: The `=` operator is properly highlighted
- ✅ **Nested configurations**: Hierarchical structures through **semantic indentation**
- ✅ **Recursive CCL parsing**: Full support for nested CCL entries within indented blocks
- ✅ **Empty key lists**: `= item1`, `= item2` syntax
- ✅ **Mixed content**: Supports both CCL entries and plain text within nested sections

### **Highlighting Levels**
- 🟡 **Basic**: Works with all tree-sitter tools (nested content as plain text)
- 🌈 **Enhanced**: Modern editors get full nested CCL syntax highlighting via injections

*See [Syntax Highlighting](#syntax-highlighting) section for detailed comparison.*

## Installation

### Requirements

This parser uses a **C++ external scanner** for handling semantic indentation, which requires native compilation:

- **C++20 compatible compiler**: GCC 10+, Clang 12+, or MSVC 2019+
- **Node.js 14+** with native module build tools
- **Python 3.x** (for node-gyp)

#### Option 1: Using mise for Python (Recommended)

[mise](https://mise.jdx.dev/) can help with Python dependency management:

```bash
# Install mise (if not already installed)
curl https://mise.jdx.dev/install.sh | sh

# Install Python and dev tools
mise install

# Still need to install C++ compiler separately:
# Ubuntu/Debian
sudo apt install build-essential

# macOS (install Xcode Command Line Tools)  
xcode-select --install

# Windows (install Visual Studio Build Tools)
# Or use: npm install --global windows-build-tools
```

> **Note**: While mise supports some compilers like `clang`, the available versions are outdated (clang 9.x) and don't support C++20. System package managers provide more recent compiler versions.

#### Option 2: Manual Installation

Install all dependencies manually:

```bash
# Ubuntu/Debian
sudo apt install build-essential python3

# macOS (install Xcode Command Line Tools)
xcode-select --install

# Windows (install Visual Studio Build Tools)
# Or use: npm install --global windows-build-tools
```

### Troubleshooting Compilation

**C++20 Standard**: The external scanner uses modern C++ features and requires C++20 support. If compilation fails:

```bash
# Specify C++20 standard explicitly
CXXFLAGS="-std=c++20" npm install

# For older GCC versions, try c++2a
CXXFLAGS="-std=c++2a" npm install
```

**Common Issues**:

1. **"unrecognized command line option '-std=c++20'"**: Your compiler is too old
   ```bash
   # Ubuntu: update to GCC 10+
   sudo apt install gcc-10 g++-10
   export CC=gcc-10 CXX=g++-10
   
   # macOS: update Xcode Command Line Tools
   xcode-select --install
   ```

2. **Node-gyp Python errors**: Ensure Python 3.x is available
   ```bash
   # Set Python version for node-gyp
   npm config set python python3
   ```

3. **Windows MSVC**: Use Developer Command Prompt or ensure VS Build Tools 2019+ installed

4. **Permission errors**: Don't use `sudo` with npm install, fix npm permissions instead

5. **mise setup**: If using mise, ensure it's in your PATH:
   ```bash
   # Add to your shell profile (.bashrc, .zshrc, etc.)
   echo 'eval "$(mise activate)"' >> ~/.bashrc
   source ~/.bashrc
   
   # Verify mise is working
   mise --version
   ```

### Install

```bash
npm install tree-sitter-ccl
```

> **Note**: This package includes a C++ external scanner for proper indentation handling. The first install will compile native modules, which may take a few minutes.

## Usage

### Command Line Interface

After installation, you can use the tree-sitter CLI to parse CCL files:

```bash
# Parse a CCL file and show the syntax tree
npx tree-sitter parse example.ccl

# Test the grammar against test cases
npx tree-sitter test

# Generate the parser (for development)
npx tree-sitter generate
```

### Editor Integration

This grammar works with any editor that supports Tree-sitter:

**Neovim**:
```lua
require'nvim-treesitter.configs'.setup {
  ensure_installed = { "ccl" },
  highlight = { enable = true },
}
```

**VS Code**: Install a Tree-sitter extension and configure it to use this grammar.

**Helix/Zed**: Add the grammar to your editor's configuration.

### Syntax Highlighting Only

If you need the grammar for syntax highlighting in tools or editors, you can access the files directly:

```javascript
// Access grammar file for editor integration
const grammarPath = require.resolve('tree-sitter-ccl/grammar.js');
const highlightsPath = require.resolve('tree-sitter-ccl/queries/highlights.scm');
```

### Syntax Highlighting

This grammar provides **two levels of syntax highlighting** depending on the tool's capabilities:

#### 🟡 **Basic Highlighting** (All tree-sitter tools)

All tools using this grammar get correct parsing and basic highlighting:

- **Keys**: Highlighted as variables (blue)
- **Values**: Highlighted as strings (green)
- **Assignment operator** (`=`): Highlighted as operators (yellow)
- **Comments** (`/=`): Highlighted as comments (gray)
- **Nested content**: Highlighted as plain text (green)

**Example output:**
```
config =
  host = localhost    ← All green (treated as string content)
  port = 8080         ← All green (treated as string content)
```

#### 🌈 **Enhanced Highlighting** (Injection-aware tools)

Modern editors with tree-sitter injection support get **full CCL syntax highlighting throughout nested structures**:

**Tools with enhanced highlighting:**
- **Neovim** (nvim-treesitter) ✅
- **VS Code** (tree-sitter extensions) ✅  
- **Helix Editor** ✅
- **Zed Editor** ✅
- **Modern Emacs** (tree-sitter package) ✅
- **GitHub** (custom injection-like highlighting) ✅

**Example output:**
```
config =
  host = localhost    ← Blue key, yellow =, green value
  port = 8080         ← Blue key, yellow =, green value
  database =          ← Blue key, yellow =
    user = admin      ← Blue key, yellow =, green value
```

#### **How It Works**

The grammar uses **tree-sitter language injections** (`queries/injections.scm`) to tell modern tools:
> "Re-parse nested content as structured CCL syntax"

This provides the best of both worlds:
- ✅ **Universal compatibility** - works with all tree-sitter tools
- ✅ **Future-proof** - enhanced highlighting comes automatically as tools modernize
- ✅ **No performance penalty** - basic tools stay fast, advanced tools get rich highlighting

#### **Testing the Difference**

You can see both highlighting levels with the included scripts:

```bash
# Basic highlighting (simulates most tools today)
node show_highlight.js your_file.ccl

# Enhanced highlighting (simulates modern editors)  
node show_highlight_enhanced.js your_file.ccl
```

## Example CCL Syntax

```ccl
/= Basic configuration
app = MyApplication
version = 1.0.0

/= Multiline description
description =
  This is a multiline description
  that spans several lines
  with proper indentation.

/= Nested configuration
database =
  host = localhost
  port = 5432
  credentials =
    username = admin
    password = secret123

/= Lists using empty keys
features =
  = authentication
  = logging
  = caching
  = monitoring

/= Multiline key example
long key name
spanning multiple lines = corresponding value
```

## Grammar Structure

The grammar defines these main constructs:

- `document`: Root node containing entries and sections
- `entry`: Key-value pair assignment
- `single_line_key`: Simple key identifier
- `multiline_key`: Key spanning multiple lines
- `single_line_value`: Simple value content
- `nested_section`: Recursive CCL block with semantic indentation
- `multiline_value`: Plain text block with semantic indentation
- `assignment`: The `=` operator
- `comment`: CCL-style comments starting with `/=`
- `indent`/`dedent`: External scanner tokens for semantic indentation
- `newline`: External scanner token for proper line handling

### External Scanner

This parser uses a C++ external scanner (`src/scanner.cc`) to handle:

- **Semantic indentation**: Context-sensitive INDENT/DEDENT tokens
- **Newline detection**: Proper handling of `\n` and `\r\n` line endings
- **State persistence**: Indentation stack management across parse operations
- **EOF handling**: Automatic DEDENT emission at end of file

## Development

### Prerequisites

- Node.js 14+
- C++ compiler (GCC, Clang, or MSVC)
- Python 3.x (for node-gyp native compilation)
- The `tree-sitter-cli` is included as a dependency

### Building

```bash
# Clone the repository
git clone https://github.com/ccl-community/tree-sitter-ccl.git
cd tree-sitter-ccl

# Option 1: Using mise for Python
mise install              # Install Python and dev tools  
sudo apt install build-essential  # Install C++ compiler (Linux)
npm install              # Install Node dependencies and compile

# Option 2: Manual setup
# Ensure you have Python 3.x, GCC 10+, and Node.js 14+
npm install

# Generate the parser
npm run generate

# Run tests
npm run test

# Parse a specific file
npm run parse example.ccl
```

### Debug Build

For debugging the external scanner, compile with debug flags:

```bash
# Enable comprehensive debug logging (with C++20)
CXXFLAGS="-std=c++20 -DDEBUG_SCANNER -g -O0" npx tree-sitter generate

# Parse with detailed scanner output
npx tree-sitter parse --debug file.ccl

# For performance profiling
CXXFLAGS="-std=c++20 -O3 -DNDEBUG" npx tree-sitter generate
```

### Testing

Add test cases in the `test/corpus/` directory and run:

```bash
npm run test
```

### Syntax Highlighting

Query files are located in `queries/`:
- `highlights.scm`: Syntax highlighting rules
- `injections.scm`: Language injection rules

## Integration

### VS Code

This grammar can be integrated into VS Code extensions for CCL syntax highlighting.

### GitHub

Submit this grammar to GitHub Linguist for automatic CCL file detection and highlighting on GitHub.

### Other Editors

Most modern editors with Tree-sitter support (Neovim, Helix, Zed, etc.) can use this grammar.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add test cases for new functionality in `test/corpus/`
4. Run `npm test` to verify all tests pass
5. Test the external scanner with debug logging if modifying `src/scanner.cc`
6. Submit a pull request

### Modifying the External Scanner

If modifying the C++ scanner (`src/scanner.cc`):

1. **Use debug build**: `CXXFLAGS="-std=c++20 -DDEBUG_SCANNER -g -O0" npx tree-sitter generate`
2. **Test incrementally**: Start with simple cases, add complexity
3. **Validate state**: Check serialization/deserialization works correctly
4. **Performance test**: Ensure no infinite loops or excessive scanning
5. **Add test corpus**: Include test cases for edge cases
6. **C++20 compliance**: Use modern C++ features consistently (ranges, concepts, etc.)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related Links

- [CCL Language Specification](https://chshersh.com/blog/2025-01-06-the-most-elegant-configuration-language.html)
- [Tree-sitter Documentation](https://tree-sitter.github.io/tree-sitter/)
- [CCL Reference Implementation](https://github.com/chshersh/ccl)

## Acknowledgments

- Thanks to Dmitrii Kovanikov for creating the CCL language specification
- Built with Tree-sitter parsing toolkit
- External scanner implementation based on Tree-sitter's Python scanner patterns

## Technical Notes

### Why an External Scanner?

CCL uses **semantic indentation** where whitespace determines nested structure. This creates parsing challenges that pure grammar rules cannot handle:

1. **Context-sensitive parsing**: Same content has different meaning based on indentation level
2. **Recursive ambiguity**: Indented content could be CCL entries or plain text
3. **Dynamic indentation**: Various indent widths require runtime tracking

The C++ external scanner solves this by:
- Tracking indentation state across parse operations
- Emitting INDENT/DEDENT tokens based on context
- Providing lookahead for grammar disambiguation
- Handling mixed tab/space indentation gracefully

### Two-Tier Highlighting Architecture

This grammar implements a **dual-level highlighting system** to balance compatibility with enhanced user experience:

#### **Design Choice: Injection over Grammar Complexity**

Rather than making the grammar infinitely recursive (which creates parsing conflicts), we use:

1. **Base Grammar**: Fast, unambiguous parsing of nested content as `content_line` nodes
2. **Injection Queries**: Modern tools re-parse `content_line` content as structured CCL

**Benefits:**
- ✅ **Universal compatibility** - all tree-sitter tools work immediately
- ✅ **No parsing conflicts** - grammar remains deterministic 
- ✅ **Performance** - basic tools get fast parsing, advanced tools get rich highlighting
- ✅ **Future-proof** - enhances automatically as editor tooling improves

**Alternative approaches considered:**
- ❌ **Infinitely recursive grammar** - creates ambiguity and parsing conflicts
- ❌ **Complex precedence rules** - fragile, hard to maintain, tool-specific behavior
- ❌ **Single-level highlighting** - poor user experience in modern editors

This architecture follows tree-sitter best practices used by HTML (JavaScript injection), Markdown (code block injection), and other multi-language grammars.

### Performance

The external scanner is optimized for performance:
- ⚡ **Fast scanning**: Minimal overhead for basic parsing
- 🔍 **Debug logging**: Comprehensive logging when compiled with `-DDEBUG_SCANNER`
- 📊 **Performance monitoring**: Built-in timing and call counting
- 🛡️ **Error recovery**: Robust handling of malformed indentation