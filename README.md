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
- ✅ **Nested configurations**: Hierarchical structures through indentation
- ✅ **Empty key lists**: `= item1`, `= item2` syntax

## Installation

```bash
npm install tree-sitter-ccl
```

> **Note**: This package includes only the Tree-sitter CLI tools and grammar files. Node.js native bindings are not included to avoid compilation issues. For programmatic parsing, use the CLI commands or integrate with editors that support Tree-sitter.

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

This grammar includes syntax highlighting queries that work with editors supporting Tree-sitter:

- **Keys**: Highlighted as variables
- **Values**: Highlighted as strings
- **Assignment operator** (`=`): Highlighted as operators
- **Comments** (`/=`): Highlighted as comments
- **Indentation**: Properly parsed for multiline structures

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
- `key`: Single-line or multiline key identifier
- `value`: Single-line or multiline value content
- `assignment`: The `=` operator
- `comment`: CCL-style comments starting with `/=`
- `section`: Nested configuration block

## Development

### Prerequisites

- Node.js 14+
- The `tree-sitter-cli` is included as a dependency

### Building

```bash
# Clone the repository
git clone https://github.com/ccl-community/tree-sitter-ccl.git
cd tree-sitter-ccl

# Install dependencies
npm install

# Generate the parser
npm run generate

# Run tests
npm run test

# Parse a specific file
npm run parse example.ccl
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
3. Add test cases for new functionality
4. Run `npm test` to verify
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related Links

- [CCL Language Specification](https://chshersh.com/blog/2025-01-06-the-most-elegant-configuration-language.html)
- [Tree-sitter Documentation](https://tree-sitter.github.io/tree-sitter/)
- [CCL Reference Implementation](https://github.com/chshersh/ccl)

## Acknowledgments

- Thanks to Dmitrii Kovanikov for creating the CCL language specification
- Built with Tree-sitter parsing toolkit