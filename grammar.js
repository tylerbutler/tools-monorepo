/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: 'ccl',

  extras: $ => [
    // Remove newlines from extras - we need to handle them explicitly
  ],

  rules: {
    document: $ => repeat($._item),

    _item: $ => choice(
      $.entry,
      $.comment,
      /\r?\n/ // Explicit newline handling
    ),

    entry: $ => choice(
      // key = value
      seq(
        $.single_line_key,
        $.assignment,
        $._value
      ),
      // multiline_key = value
      seq(
        $.multiline_key,
        $.assignment,
        seq(
          $.single_line_value,
          /\r?\n/
        )
      ),
      // = value (list syntax)
      seq(
        $.assignment,
        seq(
          $.single_line_value,
          /\r?\n/
        )
      )
    ),

    single_line_key: $ => /[^\s=\n\/][^\n\r=]*/,

    multiline_key: $ => seq(
      $.single_line_key,
      /\r?\n/,
      $.key_continuation
    ),

    key_continuation: $ => /[^\n\r=]+/,

    assignment: $ => '=',

    _value: $ => choice(
      // Multiline value: newline followed by required indented content
      seq(
        /\r?\n/,
        $.multiline_value
      ),
      // Single line value: content (possibly empty) followed by newline  
      seq(
        $.single_line_value,
        /\r?\n/
      )
    ),

    single_line_value: $ => /[^\n\r]*/,

    // Multiline value with explicit indentation
    multiline_value: $ => repeat1(seq(
      $.indent,
      $.value_line,
      /\r?\n/
    )),

    value_line: $ => /[^\n\r]*/,

    indent: $ => /[ \t]+/,

    comment: $ => seq(
      $.marker,
      optional($.comment_text),
      /\r?\n/
    ),

    marker: $ => '/=',

    comment_text: $ => /[ ][^\n\r]*/,
  }
});