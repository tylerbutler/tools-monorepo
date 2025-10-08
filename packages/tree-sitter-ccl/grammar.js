/**
 * Tree-sitter Grammar for CCL (Categorical Configuration Language)
 * ===============================================================
 *
 * This grammar defines the parsing rules for CCL, a Python-like indentation-based
 * configuration language that supports nested key-value pairs, multiline values,
 * comments, and list syntax.
 *
 * LANGUAGE FEATURES:
 * ==================
 * - Indentation-based block structure (Python-like)
 * - Key-value assignments with '=' operator
 * - Multiline keys and values
 * - Single-line and multiline comments with '/=' marker
 * - List syntax using bare '=' assignments
 * - Nested configuration sections with recursive parsing
 *
 * GRAMMAR ARCHITECTURE:
 * =====================
 * - External scanner handles INDENT/DEDENT/NEWLINE tokens (scanner.cc)
 * - Direct recursive grammar rules for nested structures
 * - Fallback to plain text for non-CCL content in nested blocks
 * - Conflict resolution with precedence and dynamic precedence
 *
 * EXAMPLE CCL SYNTAX:
 * ===================
 *   server =
 *     host = localhost
 *     port = 8080
 *     /= Server configuration
 *     /= Multiple lines supported
 *       with indented continuation
 *     config =
 *       debug = true
 *       timeout = 30
 *
 *   /= List syntax
 *   dependencies =
 *     = package1
 *     = package2
 *
 * AUTHORS: CCL Community
 * LICENSE: MIT
 * VERSION: Compatible with tree-sitter 0.20+
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export default grammar({
  name: 'ccl',

  /**
   * External tokens handled by the C++ scanner (scanner.cc)
   *
   * These tokens implement Python-like indentation-based block structure:
   * - newline: Line terminators (\n, \r\n) that trigger indentation analysis
   * - indent: Generated when indentation increases (opens new block)
   * - dedent: Generated when indentation decreases (closes block(s))
   *
   * The external scanner maintains an indentation stack and generates
   * these tokens based on whitespace analysis at line boundaries.
   */
  externals: $ => [
    $.newline,
    $.indent,
    $.dedent
  ],

  /**
   * Parsing conflicts and their resolution strategies
   *
   * Tree-sitter uses GLR parsing which can handle some ambiguities,
   * but these conflicts need explicit resolution through precedence.
   *
   * - [$.comment]: Multiline vs single-line comment disambiguation
   *   Both start with '/=' marker, distinguished by presence of indented continuation
   */
  conflicts: $ => [
    [$.comment]
  ],

  /**
   * Whitespace handling configuration
   *
   * Only spaces and tabs are treated as ignorable whitespace.
   * Newlines are NOT included because they're significant for:
   * - Triggering indentation analysis in the external scanner
   * - Determining line boundaries for multiline constructs
   * - Proper comment parsing and continuation
   *
   * This is critical for indentation-based languages!
   */
  extras: $ => [
    /[ \t]/,  // Allow spaces and tabs as extras, but NOT newlines
  ],

  rules: {
    /**
     * Root document node - sequence of top-level items
     *
     * A CCL document consists of zero or more items (entries, comments, newlines).
     * This allows for flexible document structure including empty files.
     */
    document: $ => repeat($._item),

    /**
     * Document item - internal rule for top-level constructs
     *
     * Precedence ordering ensures correct parsing:
     * 1. Comments (prec 2) - Highest priority, '/=' always starts comment
     * 2. Entries (prec 1) - Key-value pairs and list items
     * 3. Newlines (prec 0) - Default, structural whitespace
     *
     * The underscore prefix (_item) makes this an internal rule
     * that doesn't appear in the final syntax tree.
     */
    _item: $ => choice(
      prec(2, $.comment),      // Highest precedence for comment recognition
      prec(1, $.entry),        // Medium precedence for key-value entries
      $.newline                // Default precedence for structural newlines
    ),

    /**
     * Entry - key-value assignments and list items
     *
     * Supports three CCL assignment patterns:
     *
     * 1. Single-line: "key = value"
     *    - Key and value on same line
     *    - Value can be single-line, nested block, or multiline
     *
     * 2. Multiline key: "key\n  continuation = value"
     *    - Key spans multiple lines with indented continuation
     *    - Common for long configuration keys
     *    - Only allowed at top level, not inside nested blocks
     *
     * 3. List syntax: "= value"
     *    - Bare assignment for list items
     *    - Used in array-like configurations
     */
    entry: $ => choice(
      // Standard key-value assignment: "key = value"
      seq(
        $.single_line_key,
        $.assignment,
        $._value
      ),
      // Multiline key assignment: "key\n  continuation = value"
      seq(
        $.multiline_key,
        $.assignment,
        $.single_line_value
      ),
      // List item assignment: "= value"
      seq(
        $.assignment,
        $.single_line_value
      )
    ),


    /**
     * Single-line key - identifier for configuration entries
     *
     * Pattern: First char cannot be whitespace, '=', newline, or '/'.
     * Remaining chars can be anything except newlines and '=' (stops at assignment).
     *
     * EXAMPLES:
     *   ✓ "server"      ✓ "host.name"    ✓ "config_option"
     *   ✗ "=invalid"    ✗ "/= comment"   ✗ "multi\nline"
     */
    single_line_key: $ => /[^\s=\n\/][^\n\r=]*/,

    /**
     * Multiline key - keys spanning multiple lines with continuation
     *
     * Structure: "initial_part\n  continuation_part = value"
     * Used for long configuration keys that need line breaks for readability.
     *
     * EXAMPLE:
     *   database_connection
     *     timeout_seconds = 30
     */
    multiline_key: $ => seq(
      $.single_line_key,    // Initial part of the key
      $.newline,           // Line break
      $.key_continuation   // Indented continuation
    ),

    /**
     * Key continuation - second part of multiline keys
     *
     * REGEX: /[^\n\r=]+/
     * - Matches any characters except newlines and '=' (stops at assignment)
     * - Typically contains the descriptive part of compound keys
     */
    key_continuation: $ => /[^\n\r=]+/,

    /**
     * Assignment operator - separates keys from values
     *
     * The '=' character is the only assignment operator in CCL,
     * providing clear key-value separation in all contexts.
     */
    assignment: $ => '=',

    /**
     * Value - internal rule for different value types
     *
     * Precedence resolves ambiguity between nested blocks and plain text:
     *
     * 1. single_line_value - Unambiguous, always preferred when possible
     * 2. nested_block - Structured content with key-value pairs
     *    - Chosen when indented content contains '=' assignments or comments
     *    - Enables recursive CCL parsing via direct grammar recursion
     *    - Higher precedence ensures structured content is preferred
     * 3. multiline_value - Plain text content
     *    - Fallback for indented content without CCL structure
     *    - Treats content as literal text lines
     *    - Lowest precedence makes it the fallback choice
     *
     * The parser uses GLR to explore both paths and chooses based on
     * static precedence combined with what actually parses successfully.
     */
    _value: $ => choice(
      // Single line value - unambiguous, no indentation needed
      $.single_line_value,
      // Nested content - parsed via injection system
      // Raw text captured first, then re-parsed as CCL via injections.scm
      $.nested_content,
      // Multiline value - plain text without indentation structure
      $.multiline_value
    ),

    /**
     * Single-line value - value content on the same line as assignment
     *
     * Pattern: Matches any characters except line terminators.
     * Allows empty values (just '=' with nothing after).
     * Stops at line boundaries to maintain line structure.
     */
    single_line_value: $ => /[^\n\r]*/,

    /**
     * Nested content - indented block captured as raw text for injection
     *
     * Structure: "key =\n  raw_text_lines"
     *
     * This captures nested content as raw text without attempting to parse
     * it during the first pass. The content is then re-parsed as CCL via
     * the injection system (see queries/injections.scm).
     *
     * This two-pass approach solves the ambiguity problem:
     * - Pass 1: Capture all indented lines as raw text
     * - Pass 2: Injection re-parses as CCL (entries, comments, values)
     *
     * EXAMPLE:
     *   server =
     *     host = localhost    # <- content_line (raw text in pass 1)
     *     port = 8080         # <- content_line (parsed as entry in pass 2)
     */
    nested_content: $ => seq(
      $.newline,        // Start new line after assignment
      $.indent,         // Increase indentation (from external scanner)
      repeat(choice(
        $.content_line,   // Raw text line (will be re-parsed via injection)
        $.newline         // Structural newlines
      )),
      $.dedent          // Decrease indentation (from external scanner)
    ),

    /**
     * Content line - single line of raw text within nested content
     *
     * Captures the entire line as text without parsing structure.
     * The injection system will re-parse this content as CCL in pass 2.
     *
     * Pattern matches everything except newlines, allowing the line to
     * contain any CCL syntax (entries, comments, plain text, etc.)
     */
    content_line: $ => /[^\n\r]*/,


    /**
     * Multiline value - indented block treated as literal text
     *
     * Structure: "key =\n  literal_text_lines"
     *
     * Unlike nested_block, this treats the indented content as plain text values
     * rather than attempting to parse as CCL structure. Used for:
     * - Documentation text
     * - Configuration templates
     * - Any literal multi-line content
     *
     * Precedence controlled by dynamic precedence in _value choice.
     * Parser tries this when content doesn't contain CCL structure (no '=' or comments).
     *
     * EXAMPLE:
     *   story =
     *     Once upon a time, there was a configuration language
     *     that was simple and elegant.
     */
    multiline_value: $ => seq(
      $.newline,            // Start new line after assignment
      $.indent,             // Increase indentation
      repeat1(seq(
        alias(/[^=\/\n\r][^=\n\r]*/, $.value_line),  // Line content (no '=' or '/') as value_line
        $.newline           // Line terminator
      )),
      $.dedent              // Decrease indentation
    ),

    /**
     * Comment - single-line or multiline comments with '/=' marker
     *
     * CCL uses '/=' as the comment marker (inspired by mathematical "not equal").
     *
     * Two forms supported:
     * 1. Single-line: "/= comment text"
     * 2. Multiline: "/= comment text\n  indented continuation"
     *
     * Dynamic precedence (prec.dynamic(2)) ensures multiline comments
     * are recognized when indentation follows immediately after the
     * initial comment line.
     *
     * Aliases create distinct node types for syntax highlighting:
     * - comment_marker: The '/=' symbol
     * - comment_text: The actual comment content
     */
    comment: $ => choice(
      // Multiline comment - higher precedence when indent detected
      prec.dynamic(2, seq(
        alias('/=', $.comment_marker),      // Comment start symbol
        alias(/[^\r\n]*/, $.comment_text), // Initial comment line text
        $.multiline_comment_content        // Indented continuation lines
      )),
      // Single-line comment - default case
      seq(
        alias('/=', $.comment_marker),      // Comment start symbol
        alias(/[^\r\n]*/, $.comment_text)  // Comment text until end of line
      )
    ),

    /**
     * Multiline comment content - indented continuation lines
     *
     * Structure: "initial_line\n  indented_continuation"
     *
     * Each continuation line is parsed as comment_content_line to maintain
     * the line structure while ensuring all content is recognized as comment text.
     *
     * Uses repeat1() to require at least one continuation line,
     * distinguishing multiline comments from single-line ones.
     */
    multiline_comment_content: $ => seq(
      $.newline,                        // Line break after initial comment
      $.indent,                         // Increase indentation
      repeat1($.comment_content_line),  // One or more continuation lines
      $.dedent                          // Decrease indentation
    ),

    /**
     * Comment content line - single line within multiline comments
     *
     * Structure: "text_content\n"
     *
     * Each line consists of:
     * 1. Text content (aliased as comment_text for highlighting)
     * 2. Newline terminator
     *
     * This structure preserves line boundaries while ensuring all
     * content within multiline comments is properly categorized
     * as comment text for syntax highlighting.
     */
    comment_content_line: $ => seq(
      alias(/[^\n\r]*/, $.comment_text), // Line content as comment text
      $.newline                          // Line terminator
    ),
  }
});
