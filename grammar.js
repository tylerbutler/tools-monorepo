/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: 'ccl',

  externals: $ => [
    $.newline,
    $.indent,
    $.dedent
  ],

  conflicts: $ => [
    [$.nested_section, $.multiline_value]
  ],

  extras: $ => [
    /[ \t]/,  // Allow spaces and tabs as extras, but not newlines
  ],

  rules: {
    document: $ => repeat($._item),

    _item: $ => choice(
      prec(2, $.comment),      // High precedence for comments
      prec(1, $.entry),
      $.newline
    ),

    entry: $ => choice(
      // key = value (single line)
      seq(
        $.single_line_key,
        $.assignment,
        $._value
      ),
      // multiline_key = value
      seq(
        $.multiline_key,
        $.assignment,
        $.single_line_value
      ),
      // = value (list syntax)
      seq(
        $.assignment,
        $.single_line_value
      )
    ),

    single_line_key: $ => /[^\s=\n\/][^\n\r=]*/,

    multiline_key: $ => seq(
      $.single_line_key,
      $.newline,
      $.key_continuation
    ),

    key_continuation: $ => /[^\n\r=]+/,

    assignment: $ => '=',

    _value: $ => choice(
      // Nested section with recursive CCL parsing (higher precedence)
      prec(2, $.nested_section),
      // Multiline value with plain text (lower precedence)
      prec(1, $.multiline_value),
      // Single line value
      $.single_line_value
    ),

    single_line_value: $ => /[^\n\r]*/,

    // Nested section with recursive CCL parsing
    nested_section: $ => seq(
      $.newline,
      $.indent,
      repeat($._nested_item),
      $.dedent
    ),

    _nested_item: $ => choice(
      prec(2, $.entry),        // Prefer CCL entries over plain text
      prec(2, $.comment),      // CCL comments within nested blocks
      prec(1, $.value_line),   // Plain text fallback (lower precedence)
      $.newline                // Allow newlines between nested items
    ),

    // Multiline value with plain text lines
    multiline_value: $ => seq(
      $.newline,
      $.indent,
      repeat($.value_line),
      $.dedent
    ),

    value_line: $ => /[^\n\r]*/,

    comment: $ => /\/=[^\n\r]*/,
  }
});