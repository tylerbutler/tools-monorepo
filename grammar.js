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
      // Indented content (treat uniformly for syntax highlighting)
      seq(
        /\r?\n/,
        $.indented_content
      ),
      // Single line value: content (possibly empty) followed by newline  
      seq(
        $.single_line_value,
        /\r?\n/
      )
    ),

    single_line_value: $ => /[^\n\r]*/,

    // All indented content - uniform treatment for syntax highlighting
    indented_content: $ => repeat1(seq(
      $.indent,
      $.content_line,
      /\r?\n/
    )),

    content_line: $ => /[^\n\r]*/,

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