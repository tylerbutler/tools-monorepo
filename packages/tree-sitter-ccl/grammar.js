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
 * - Nested configuration sections with recursive CCL parsing
 * 
 * GRAMMAR ARCHITECTURE:
 * =====================
 * - External scanner handles INDENT/DEDENT/NEWLINE tokens (scanner.cc)
 * - Main grammar handles key-value structure and assignments
 * - Injection system enables nested CCL parsing within sections
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
   * but these conflicts need explicit resolution:
   * 
   * 1. [nested_section, multiline_value] - When content contains '='
   *    Resolution: Dynamic precedence favors nested_section for structured content
   * 
   * 2. [nested_content, multiline_value] - Content vs plain text interpretation  
   *    Resolution: Context and precedence determine parsing path
   * 
   * 3. [comment] - Comment parsing in different contexts
   *    Resolution: Precedence rules favor comment recognition
   */
  conflicts: $ => [
    [$.nested_section, $.multiline_value],
    [$.nested_content, $.multiline_value],
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
     *    - Value can be single-line, nested section, or multiline
     * 
     * 2. Multiline key: "key\n  continuation = value"
     *    - Key spans multiple lines with indented continuation
     *    - Common for long configuration keys
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
     * Dynamic precedence resolves ambiguity between nested sections and plain text:
     * 
     * 1. single_line_value - Unambiguous, always preferred when possible
     * 2. nested_section (prec 2) - Structured content with key-value pairs
     *    - Chosen when indented content contains '=' assignments
     *    - Enables recursive CCL parsing via injection
     * 3. multiline_value (prec 1) - Plain text content
     *    - Fallback for indented content without structure
     *    - Treats content as literal text
     * 
     * The parser uses lookahead and context to make the best choice.
     */
    _value: $ => choice(
      // Single line value - unambiguous, no indentation needed
      $.single_line_value,
      // Nested section - structured content with recursive CCL parsing
      prec.dynamic(2, $.nested_section),
      // Multiline value - plain text content
      prec.dynamic(1, $.multiline_value)
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
     * Nested section - indented block for structured content
     * 
     * Structure: "key =\n  indented_content"
     * 
     * This creates a block that will be parsed as CCL via injection.
     * The injection system (injections.scm) recognizes nested_content
     * and re-parses it as a complete CCL document, enabling recursive
     * configuration structure.
     * 
     * EXAMPLE:
     *   server =
     *     host = localhost    # <- This becomes a nested CCL document
     *     port = 8080
     */
    nested_section: $ => seq(
      $.newline,        // Start new line
      $.indent,         // Increase indentation (from external scanner)
      $.nested_content, // Content to be injected as CCL
      $.dedent          // Decrease indentation (from external scanner)
    ),

    /**
     * Nested content - raw content for CCL injection
     * 
     * This captures the raw text inside nested sections, which is later
     * re-parsed as CCL through the injection system. The content preserves
     * its original structure (lines and newlines) so the injection can
     * parse it correctly.
     * 
     * Must contain at least one item (repeat1) to ensure non-empty blocks.
     */
    nested_content: $ => repeat1(choice(
      $.content_line,   // Text content lines
      $.newline        // Structural newlines
    )),
    
    /**
     * Content line - single line of content within nested blocks
     *
     * Pattern: Captures any characters except line terminators.
     * Allows empty lines within content blocks.
     * Used in both nested_content and multiline_value contexts.
     */
    content_line: $ => /[^\n\r]*/, 


    /**
     * Multiline value - indented block treated as literal text
     * 
     * Structure: "key =\n  literal_text_content"
     * 
     * Unlike nested_section, this treats the indented content as plain text
     * rather than structured CCL. Used for:
     * - Documentation text
     * - Configuration templates  
     * - Any literal multi-line content
     * 
     * Uses repeat() (not repeat1()) to allow empty multiline values.
     */
    multiline_value: $ => seq(
      $.newline,           // Start new line
      $.indent,           // Increase indentation
      repeat($.content_line), // Zero or more lines of literal text
      $.dedent            // Decrease indentation
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