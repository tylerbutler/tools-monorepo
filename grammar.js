/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: 'ccl',

  extras: $ => [
    /\r?\n/, // Newlines as extras
  ],

  rules: {
    document: $ => repeat($._item),

    _item: $ => choice(
      $.entry,
      $.comment
    ),

    entry: $ => choice(
      // key = value (with content on same line)
      seq(
        $.single_line_key,
        $.assignment,
        $.single_line_value
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
      $.key_continuation
    ),

    key_continuation: $ => /[^\n\r=]+/,

    assignment: $ => '=',

    // Values can be empty (for empty values) or have content (including multiline)
    single_line_value: $ => choice(
      $.multiline_value,
      token(/[^\n\r]*/)
    ),

    multiline_value: $ => repeat1(seq(
      $.indent,
      $.value_line
    )),

    value_line: $ => /[^\n\r]*/,

    indent: $ => /[ \t]+/,

    comment: $ => seq(
      $.marker,
      optional($.comment_text)
    ),

    marker: $ => '/=',

    comment_text: $ => prec.right(/[ ][^\n\r]*/),
  }
});